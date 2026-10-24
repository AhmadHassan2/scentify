import type {
  Fragrance,
  FragranceSummary,
  FragranceVariant,
  NoteTier,
} from "@/types/fragrance";

/** How much each pyramid tier contributes to a fragrance's perceived character. */
export const TIER_WEIGHT: Record<NoteTier, number> = {
  top: 0.8,
  middle: 1,
  base: 1.1,
};

export interface WeightedNote {
  id: string;
  tier: NoteTier;
  /** Tier weight decayed by position within the tier (lead notes matter most). */
  weight: number;
}

export function weightedNotes(f: Pick<Fragrance, "notes">): WeightedNote[] {
  const out: WeightedNote[] = [];
  (["top", "middle", "base"] as const).forEach((tier) => {
    f.notes[tier].forEach((id, index) => {
      out.push({ id, tier, weight: TIER_WEIGHT[tier] * (1 / (1 + index * 0.25)) });
    });
  });
  return out;
}

export function allNoteIds(f: Pick<Fragrance, "notes">): string[] {
  return [...f.notes.top, ...f.notes.middle, ...f.notes.base];
}

export function cheapestVariant(f: Pick<Fragrance, "variants">): FragranceVariant {
  return f.variants.reduce((min, v) => (v.price < min.price ? v : min), f.variants[0]);
}

/** Lowest known price: retailer offers if present, otherwise list price. */
export function entryPrice(f: Pick<Fragrance, "variants" | "offers">): number {
  const offerPrices = f.offers.filter((o) => o.inStock).map((o) => o.price);
  const listPrice = cheapestVariant(f).price;
  return offerPrices.length ? Math.min(listPrice, ...offerPrices) : listPrice;
}

/** Price normalized to a 100 ml equivalent, for fair "value" comparisons. */
export function pricePer100ml(f: Pick<Fragrance, "variants">): number {
  return Math.min(...f.variants.map((v) => (v.price / v.sizeMl) * 100));
}

export function toSummary(f: Fragrance): FragranceSummary {
  const cheapest = cheapestVariant(f);
  return {
    id: f.id,
    slug: f.slug,
    name: f.name,
    brand: f.brand,
    concentration: f.concentration,
    families: f.families,
    topNotes: [...f.notes.top.slice(0, 2), ...f.notes.middle.slice(0, 1), ...f.notes.base.slice(0, 1)],
    accords: f.accords.slice(0, 4),
    priceFrom: entryPrice(f),
    priceFromSizeMl: cheapest.sizeMl,
    currency: cheapest.currency,
    longevity: f.longevity,
    projection: f.projection,
    versatility: f.versatility,
    seasons: f.seasons,
    occasions: f.occasions,
    sizes: f.variants.map((v) => v.sizeMl).sort((a, b) => a - b),
    priceTier: f.priceTier,
    rating: f.rating,
    visual: f.visual,
    isSynthetic: f.isSynthetic,
  };
}

export function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

export function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
