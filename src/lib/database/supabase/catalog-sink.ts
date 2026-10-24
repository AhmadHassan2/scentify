import type { SupabaseClient } from "@supabase/supabase-js";
import type { Fragrance } from "@/types/fragrance";
import { NOTES } from "@/lib/fragrance/notes";
import { dedupeKey } from "@/lib/providers/normalize";
import type { CatalogSink, SyncKind, SyncSummary } from "@/lib/providers/sync";
import type { FragranceDataProvider } from "@/lib/providers/types";
import { stableUuid } from "@/lib/providers/synthetic/generator";

/**
 * Writes normalized fragrances into Supabase with the service-role client.
 * Every write is an idempotent upsert keyed by stable ids, so syncs can be
 * re-run safely. Used by `npm run seed` and `npm run sync`.
 */
export class SupabaseCatalogSink implements CatalogSink {
  constructor(private readonly db: SupabaseClient) {}

  private check(error: { message: string } | null, what: string) {
    if (error) throw new Error(`${what}: ${error.message}`);
  }

  async ensureSource(provider: FragranceDataProvider) {
    const m = provider.metadata;
    const { error } = await this.db.from("data_sources").upsert({
      id: m.id,
      name: m.name,
      kind: m.kind,
      license: m.license,
      attribution: m.attribution,
      homepage_url: m.homepage,
      commercial_use_verified: m.commercialUseVerified,
    });
    this.check(error, "upsert data source");
    // Note taxonomy is shared across providers.
    const { error: notesError } = await this.db.from("notes").upsert(
      NOTES.map((n) => ({
        id: n.id,
        name: n.name,
        note_group: n.groups[0],
        secondary_group: n.groups[1] ?? null,
        aliases: n.aliases ?? [],
        warmth: n.warmth,
        intensity: n.intensity,
      })),
    );
    this.check(notesError, "upsert notes");
  }

  async getLastSuccessfulSync(sourceId: string, kind: SyncKind): Promise<Date | null> {
    const { data, error } = await this.db
      .from("sync_history")
      .select("started_at")
      .eq("source_id", sourceId)
      .eq("kind", kind)
      .eq("status", "succeeded")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    this.check(error, "read sync history");
    return data ? new Date(data.started_at as string) : null;
  }

  async upsertFragrances(batch: Fragrance[]): Promise<number> {
    if (!batch.length) return 0;
    const brands = [...new Map(batch.map((f) => [f.brandSlug, f])).values()].map((f) => ({
      id: stableUuid(`brand:${f.brandSlug}`),
      slug: f.brandSlug,
      name: f.brand,
      tier: f.priceTier,
      is_synthetic: f.isSynthetic,
      source_id: f.source.providerId,
    }));
    this.check((await this.db.from("brands").upsert(brands, { onConflict: "slug" })).error, "upsert brands");
    const { data: brandRows, error: brandErr } = await this.db.from("brands").select("id, slug").in("slug", brands.map((b) => b.slug));
    this.check(brandErr, "read brands");
    const brandId = new Map((brandRows ?? []).map((b) => [b.slug as string, b.id as string]));

    const fragranceRows = batch.map((f) => ({
      id: f.id,
      slug: f.slug,
      name: f.name,
      brand_id: brandId.get(f.brandSlug),
      concentration: f.concentration,
      gender: f.gender,
      release_year: f.releaseYear,
      description: f.description,
      families: f.families,
      accords: f.accords,
      longevity: f.longevity,
      projection: f.projection,
      versatility: f.versatility,
      time_day: f.timeOfDay.day,
      time_night: f.timeOfDay.night,
      rating: f.rating,
      popularity: f.popularity,
      visual: f.visual,
      image_url: f.imageUrl,
      is_synthetic: f.isSynthetic,
      source_id: f.source.providerId,
      source_record_id: f.source.providerRecordId,
      source_url: f.source.sourceUrl,
      attribution: f.source.attribution,
      license: f.source.license,
      dedupe_key: dedupeKey(f.brand, f.name, f.concentration),
      source_updated_at: f.source.lastUpdated,
    }));
    this.check((await this.db.from("fragrances").upsert(fragranceRows)).error, "upsert fragrances");

    const ids = batch.map((f) => f.id);
    this.check((await this.db.from("fragrance_notes").delete().in("fragrance_id", ids)).error, "clear notes");
    const noteRows = batch.flatMap((f) =>
      (["top", "middle", "base"] as const).flatMap((tier) =>
        f.notes[tier].map((note_id, position) => ({ fragrance_id: f.id, note_id, tier, position })),
      ),
    );
    this.check((await this.db.from("fragrance_notes").insert(noteRows)).error, "insert notes");

    const attrRows = batch.map((f) => ({
      fragrance_id: f.id,
      ...f.attributes,
      season_spring: f.seasons.spring,
      season_summer: f.seasons.summer,
      season_autumn: f.seasons.autumn,
      season_winter: f.seasons.winter,
      occasion_work: f.occasions.work,
      occasion_school: f.occasions.school,
      occasion_date: f.occasions.date,
      occasion_casual: f.occasions.casual,
      occasion_formal: f.occasions.formal,
      occasion_gym: f.occasions.gym,
      occasion_night_out: f.occasions.night_out,
    }));
    this.check((await this.db.from("fragrance_attributes").upsert(attrRows)).error, "upsert attributes");

    const variantRows = batch.flatMap((f) =>
      f.variants.map((v) => ({
        id: v.id,
        fragrance_id: f.id,
        size_ml: v.sizeMl,
        list_price: v.price,
        currency: v.currency,
        is_synthetic: v.isSynthetic,
      })),
    );
    if (variantRows.length) this.check((await this.db.from("fragrance_variants").upsert(variantRows)).error, "upsert variants");
    return batch.length;
  }

  /** Recompute "related" links after a full sync (needs the whole catalog). */
  async replaceRelated(catalog: Fragrance[], source = "computed") {
    this.check((await this.db.from("fragrance_related").delete().eq("source", source)).error, "clear related");
    const rows = catalog.flatMap((f) => f.relatedIds.map((related_id, rank) => ({ fragrance_id: f.id, related_id, rank, source })));
    for (let i = 0; i < rows.length; i += 500) {
      this.check((await this.db.from("fragrance_related").insert(rows.slice(i, i + 500))).error, "insert related");
    }
  }

  async recordSync(s: SyncSummary) {
    const { error } = await this.db.from("sync_history").insert({
      source_id: s.sourceId,
      kind: s.kind,
      mode: s.mode,
      status: s.status,
      started_at: s.startedAt,
      finished_at: s.finishedAt,
      records_fetched: s.fetched,
      records_upserted: s.upserted,
      records_skipped: s.skipped,
      duplicates: s.duplicates,
      issues: s.issues.slice(0, 200),
      error: s.error,
    });
    if (error) console.warn("Could not record sync history:", error.message);
  }
}

