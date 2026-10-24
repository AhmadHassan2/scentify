import type { Fragrance, FragranceFamily, PriceTier } from "@/types/fragrance";
import { NOTE_GROUP_FAMILY, type NoteGroup } from "@/lib/fragrance/notes";
import { slugify } from "@/lib/fragrance/utils";
import { enrichFromNotes, stableUuid } from "../synthetic/generator";
import { normalizeConcentration, normalizeNotes } from "../normalize";
import { RateLimiter, withRetry } from "../rate-limit";
import {
  ProviderNotConfiguredError,
  type FragranceDataProvider,
  type ProviderMetadata,
} from "../types";

/**
 * Common shape most structured fragrance datasets can be mapped into.
 * Concrete adapters translate their provider's raw payload into this first.
 * NOTE: field names of real providers must be confirmed against their docs.
 */
export interface RawExternalFragrance {
  externalId: string;
  brand: string;
  name: string;
  concentration?: string | null;
  gender?: string | null;
  releaseYear?: number | null;
  description?: string | null;
  topNotes: string[];
  middleNotes: string[];
  baseNotes: string[];
  imageUrl?: string | null;
  sourceUrl?: string | null;
  updatedAt: string;
  /** Optional provider-supplied performance data (various scales → normalized by adapter). */
  longevity10?: number | null;
  projection10?: number | null;
  rating5?: number | null;
}

export interface PagedResult<T> {
  items: T[];
  nextCursor: string | null;
}

/**
 * Base class for future external catalog adapters. Handles credentials,
 * rate limiting, retries, paging, note normalization and enrichment.
 * Subclasses implement only `fetchPage` (the actual HTTP call) and `toRaw`.
 */
export abstract class ExternalCatalogAdapter<TPayload> implements FragranceDataProvider {
  abstract readonly metadata: ProviderMetadata;
  protected abstract readonly requiredEnv: string[];
  private limiter: RateLimiter | null = null;
  readonly unknownNotes = new Map<string, number>();

  protected abstract fetchPage(cursor: string | null, since: Date | null): Promise<PagedResult<TPayload>>;
  protected abstract fetchOne(externalId: string): Promise<TPayload | null>;
  protected abstract toRaw(payload: TPayload): RawExternalFragrance;

  protected env(name: string): string {
    return process.env[name] ?? "";
  }

  protected assertConfigured(): void {
    const missing = this.requiredEnv.filter((k) => !process.env[k]);
    if (missing.length) throw new ProviderNotConfiguredError(this.metadata.id, missing);
  }

  protected async limited<T>(fn: () => Promise<T>): Promise<T> {
    this.limiter ??= new RateLimiter(this.metadata.rateLimitPerMinute);
    await this.limiter.acquire();
    return withRetry(fn);
  }

  async getFragrances(): Promise<Fragrance[]> {
    return this.collect(null);
  }

  async getUpdatedFragrances(since: Date): Promise<Fragrance[]> {
    return this.collect(since);
  }

  async getFragranceById(id: string): Promise<Fragrance | null> {
    this.assertConfigured();
    const payload = await this.limited(() => this.fetchOne(id));
    return payload ? this.normalize(this.toRaw(payload)) : null;
  }

  private async collect(since: Date | null): Promise<Fragrance[]> {
    this.assertConfigured();
    const out: Fragrance[] = [];
    let cursor: string | null = null;
    do {
      const page: PagedResult<TPayload> = await this.limited(() => this.fetchPage(cursor, since));
      for (const item of page.items) {
        const f = this.normalize(this.toRaw(item));
        if (f) out.push(f);
      }
      cursor = page.nextCursor;
    } while (cursor);
    return out;
  }

  /** Raw → normalized Fragrance. Returns null when the record is unusable. */
  normalize(raw: RawExternalFragrance): Fragrance | null {
    const top = normalizeNotes(raw.topNotes);
    const middle = normalizeNotes(raw.middleNotes);
    const base = normalizeNotes(raw.baseNotes);
    for (const u of [...top.unknown, ...middle.unknown, ...base.unknown]) {
      this.unknownNotes.set(u, (this.unknownNotes.get(u) ?? 0) + 1);
    }
    const notes = { top: top.ids, middle: middle.ids, base: base.ids };
    if (notes.top.length + notes.middle.length + notes.base.length < 2) return null;

    const concentration = normalizeConcentration(raw.concentration);
    const enriched = enrichFromNotes(notes, concentration);
    const families = [...new Set(enriched.accords.map((a) => NOTE_GROUP_FAMILY[a.id as NoteGroup]))]
      .filter((f): f is FragranceFamily => !!f)
      .slice(0, 3);
    const slug = slugify(`${raw.brand} ${raw.name} ${concentration}`);

    return {
      id: stableUuid(`${this.metadata.id}:${raw.externalId}`),
      slug,
      name: raw.name,
      brand: raw.brand,
      brandSlug: slugify(raw.brand),
      priceTier: "designer" as PriceTier, // refined once retail offers are known
      concentration,
      gender: raw.gender === "male" ? "masculine" : raw.gender === "female" ? "feminine" : "unisex",
      releaseYear: raw.releaseYear ?? new Date().getFullYear(),
      description: raw.description ?? "",
      notes,
      families: families.length ? families : ["woody"],
      accords: enriched.accords,
      attributes: enriched.attributes,
      seasons: enriched.seasons,
      occasions: enriched.occasions,
      timeOfDay: enriched.timeOfDay,
      longevity: raw.longevity10 ?? enriched.longevity,
      projection: raw.projection10 ?? enriched.projection,
      versatility: enriched.versatility,
      // Variants/prices come from retail providers; metadata providers rarely have them.
      variants: [],
      offers: [],
      popularity: 50,
      rating: raw.rating5 ?? 0,
      visual: {
        shape: "tall",
        liquid: "#D8BE8C",
        glass: "#EFE7D8",
        cap: "#22201E",
        accent: "#D8BE8C",
      },
      imageUrl: raw.imageUrl ?? null,
      relatedIds: [],
      isSynthetic: false,
      source: {
        providerId: this.metadata.id,
        providerRecordId: raw.externalId,
        attribution: this.metadata.attribution,
        license: this.metadata.license,
        sourceUrl: raw.sourceUrl ?? null,
        lastUpdated: raw.updatedAt,
      },
    };
  }
}
