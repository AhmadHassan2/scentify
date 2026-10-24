import type {
  Fragrance,
  FragranceAttributes,
  Occasion,
  Season,
} from "@/types/fragrance";
import { ATTRIBUTE_KEYS, OCCASIONS, SEASONS } from "@/types/fragrance";

/** Row shape of the `catalog_fragrances` view. */
export interface CatalogRow {
  id: string;
  slug: string;
  name: string;
  concentration: Fragrance["concentration"];
  gender: Fragrance["gender"];
  release_year: number | null;
  description: string;
  families: Fragrance["families"];
  accords: Fragrance["accords"];
  longevity: number | string;
  projection: number | string;
  versatility: number | string;
  time_day: number | string | null;
  time_night: number | string | null;
  rating: number | string | null;
  popularity: number | null;
  visual: Fragrance["visual"] | null;
  image_url: string | null;
  is_synthetic: boolean;
  source_id: string;
  source_record_id: string;
  source_url: string | null;
  attribution: string | null;
  license: string | null;
  source_updated_at: string | null;
  brand_name: string;
  brand_slug: string;
  brand_tier: Fragrance["priceTier"] | null;
  attributes: Record<string, number | string> | null;
  notes: Partial<Record<"top" | "middle" | "base", string[]>>;
  variants: Array<{ id: string; sizeMl: number | string; price: number | string; currency: "CAD"; isSynthetic: boolean }>;
  offers: Fragrance["offers"];
  related_ids: string[];
}

const num = (v: number | string | null | undefined, fallback = 0) =>
  v === null || v === undefined ? fallback : Number(v);

export function rowToFragrance(row: CatalogRow): Fragrance {
  const a = row.attributes ?? {};
  const attributes = Object.fromEntries(ATTRIBUTE_KEYS.map((k) => [k, num(a[k])])) as FragranceAttributes;
  const seasons = Object.fromEntries(SEASONS.map((s) => [s, num(a[`season_${s}`])])) as Record<Season, number>;
  const occasions = Object.fromEntries(OCCASIONS.map((o) => [o, num(a[`occasion_${o}`])])) as Record<Occasion, number>;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brand_name,
    brandSlug: row.brand_slug,
    priceTier: row.brand_tier ?? "designer",
    concentration: row.concentration,
    gender: row.gender,
    releaseYear: row.release_year ?? 0,
    description: row.description,
    notes: { top: row.notes.top ?? [], middle: row.notes.middle ?? [], base: row.notes.base ?? [] },
    families: row.families,
    accords: row.accords ?? [],
    attributes,
    seasons,
    occasions,
    timeOfDay: { day: num(row.time_day, 0.5), night: num(row.time_night, 0.5) },
    longevity: num(row.longevity),
    projection: num(row.projection),
    versatility: num(row.versatility),
    variants: row.variants.map((v) => ({ ...v, sizeMl: num(v.sizeMl), price: num(v.price) })),
    offers: row.offers ?? [],
    popularity: row.popularity ?? 50,
    rating: num(row.rating),
    visual: row.visual ?? { shape: "tall", liquid: "#D8BE8C", glass: "#EFE7D8", cap: "#22201E", accent: "#D8BE8C" },
    imageUrl: row.image_url,
    relatedIds: row.related_ids ?? [],
    isSynthetic: row.is_synthetic,
    source: {
      providerId: row.source_id,
      providerRecordId: row.source_record_id,
      attribution: row.attribution ?? "",
      license: row.license ?? "",
      sourceUrl: row.source_url,
      lastUpdated: row.source_updated_at ?? new Date(0).toISOString(),
    },
  };
}
