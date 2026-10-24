import type {
  Fragrance,
  FragranceFamily,
  FragranceVariant,
  Occasion,
  Season,
} from "@/types/fragrance";
import type { PreferenceAdjustments, PreferenceProfile } from "@/types/preferences";
import { pricePer100ml } from "@/lib/fragrance/utils";
import { mergeProfile } from "./defaults";
import { compareScored, scoreFragrance } from "./engine";
import { applyHardFilters } from "./filters";
import type { ScoredFragrance } from "./types";

export const BUDGET_SORTS = ["score", "price_asc", "price_desc", "value"] as const;
export type BudgetSort = (typeof BUDGET_SORTS)[number];

export interface BudgetFilters {
  minPrice: number;
  maxPrice: number;
  /** Strict = never show anything above maxPrice. Default for the Budget Finder. */
  strict: boolean;
  brands: string[];
  families: FragranceFamily[];
  sizesMl: number[];
  seasons: Season[];
  occasions: Occasion[];
  minLongevity: number;
  sort: BudgetSort;
}

export interface BudgetResult extends ScoredFragrance {
  /** The bottle size that satisfies the price/size filters (cheapest qualifying). */
  variant: FragranceVariant;
}

/** Suitability threshold for season/occasion filters. */
const SUITABLE = 0.6;

export function budgetSearch(
  catalog: Fragrance[],
  filters: BudgetFilters,
  profile: PreferenceProfile,
  adjustments?: PreferenceAdjustments,
): { results: BudgetResult[]; total: number } {
  // The user's taste still matters; the budget comes from the filters.
  const effective = mergeProfile(profile, {
    budget: { min: filters.minPrice, max: filters.maxPrice, strict: false },
    families: filters.families.length ? filters.families : profile.families,
    seasons: filters.seasons.length ? filters.seasons : profile.seasons,
    occasions: filters.occasions.length ? filters.occasions : profile.occasions,
  });
  // Keep note exclusions, but price is handled per-variant below.
  const { eligible } = applyHardFilters(catalog, { ...effective, budget: { ...effective.budget, strict: false } }, {
    adjustments,
    excludeOwned: false,
  });
  const brands = new Set(filters.brands);

  const results: BudgetResult[] = [];
  for (const f of eligible) {
    if (brands.size && !brands.has(f.brandSlug)) continue;
    if (filters.families.length && !f.families.some((fam) => filters.families.includes(fam))) continue;
    if (filters.seasons.length && !filters.seasons.some((s) => f.seasons[s] >= SUITABLE)) continue;
    if (filters.occasions.length && !filters.occasions.some((o) => f.occasions[o] >= SUITABLE)) continue;
    if (f.longevity < filters.minLongevity) continue;

    const variants = f.variants
      .filter((v) => !filters.sizesMl.length || filters.sizesMl.includes(v.sizeMl))
      .filter((v) => v.price >= filters.minPrice && (!filters.strict || v.price <= filters.maxPrice))
      .sort((a, b) => a.price - b.price);
    const variant = variants[0];
    if (!variant) continue;

    results.push({ ...scoreFragrance(f, effective, adjustments), variant });
  }

  const sorters: Record<BudgetSort, (a: BudgetResult, b: BudgetResult) => number> = {
    score: compareScored,
    price_asc: (a, b) => a.variant.price - b.variant.price || compareScored(a, b),
    price_desc: (a, b) => b.variant.price - a.variant.price || compareScored(a, b),
    value: (a, b) =>
      b.score / pricePer100ml(b.fragrance) - a.score / pricePer100ml(a.fragrance) || compareScored(a, b),
  };
  results.sort(sorters[filters.sort]);
  return { results, total: results.length };
}
