/**
 * Core fragrance domain types.
 *
 * These are provider-agnostic: synthetic data, Supabase rows and future
 * external datasets are all normalized into this shape before they reach the
 * recommendation engine or the UI.
 */

export const FRAGRANCE_FAMILIES = [
  "citrus",
  "aquatic",
  "aromatic",
  "green",
  "floral",
  "fruity",
  "woody",
  "spicy",
  "amber",
  "gourmand",
  "leather",
  "smoky",
  "musky",
] as const;
export type FragranceFamily = (typeof FRAGRANCE_FAMILIES)[number];

export const SEASONS = ["spring", "summer", "autumn", "winter"] as const;
export type Season = (typeof SEASONS)[number];

export const OCCASIONS = [
  "work",
  "school",
  "date",
  "casual",
  "formal",
  "gym",
  "night_out",
] as const;
export type Occasion = (typeof OCCASIONS)[number];

export const CONCENTRATIONS = ["EDC", "EDT", "EDP", "Parfum", "Extrait"] as const;
export type Concentration = (typeof CONCENTRATIONS)[number];

export const GENDER_STYLES = ["masculine", "feminine", "unisex"] as const;
export type GenderStyle = (typeof GENDER_STYLES)[number];

export const NOTE_TIERS = ["top", "middle", "base"] as const;
export type NoteTier = (typeof NOTE_TIERS)[number];

/** Perceptual scent characteristics on a 0–10 scale. */
export const ATTRIBUTE_KEYS = [
  "freshness",
  "sweetness",
  "woodiness",
  "spiciness",
  "warmth",
  "floralness",
  "fruitiness",
  "greenness",
  "smokiness",
  "creaminess",
  "powderiness",
  "muskiness",
] as const;
export type AttributeKey = (typeof ATTRIBUTE_KEYS)[number];
export type FragranceAttributes = Record<AttributeKey, number>;

export const PRICE_TIERS = ["budget", "designer", "niche", "luxury"] as const;
export type PriceTier = (typeof PRICE_TIERS)[number];

export type Currency = "CAD";

export interface FragranceNotes {
  top: string[];
  middle: string[];
  base: string[];
}

export interface Accord {
  /** Accord id (matches a note group id, e.g. "woody", "warm_spice"). */
  id: string;
  label: string;
  /** Relative prominence, 0–100. */
  strength: number;
}

/** A purchasable bottle size. Separate from retail offers by design. */
export interface FragranceVariant {
  id: string;
  sizeMl: number;
  /** Reference/list price. Synthetic for the demo catalog. */
  price: number;
  currency: Currency;
  isSynthetic: boolean;
}

/** A specific retailer's price for a variant. Empty for the demo catalog. */
export interface RetailerOffer {
  id: string;
  variantId: string;
  retailer: string;
  price: number;
  currency: Currency;
  url: string | null;
  inStock: boolean;
  lastCheckedAt: string;
  isSynthetic: boolean;
}

export type BottleShape = "tall" | "square" | "round" | "flask" | "obelisk" | "cylinder";

/** Parameters for the self-drawn SVG bottle (no third-party product photos). */
export interface BottleVisual {
  shape: BottleShape;
  liquid: string;
  glass: string;
  cap: string;
  accent: string;
}

export interface SourceMetadata {
  providerId: string;
  providerRecordId: string;
  attribution: string;
  license: string;
  sourceUrl: string | null;
  lastUpdated: string;
}

export interface Fragrance {
  id: string;
  slug: string;
  name: string;
  brand: string;
  brandSlug: string;
  priceTier: PriceTier;
  concentration: Concentration;
  gender: GenderStyle;
  releaseYear: number;
  description: string;
  notes: FragranceNotes;
  /** Ordered: primary family first. */
  families: FragranceFamily[];
  accords: Accord[];
  attributes: FragranceAttributes;
  /** Suitability 0–1 per season. */
  seasons: Record<Season, number>;
  /** Suitability 0–1 per occasion. */
  occasions: Record<Occasion, number>;
  /** Suitability 0–1 for daytime vs evening wear. */
  timeOfDay: { day: number; night: number };
  /** 1–10 */
  longevity: number;
  /** 1–10 */
  projection: number;
  /** 1–10 */
  versatility: number;
  variants: FragranceVariant[];
  offers: RetailerOffer[];
  /** 0–100, used for "hidden gem" detection. */
  popularity: number;
  /** Community-style rating 1–5 (synthetic for demo data). */
  rating: number;
  visual: BottleVisual;
  imageUrl: string | null;
  relatedIds: string[];
  isSynthetic: boolean;
  source: SourceMetadata;
}

/** Lightweight shape sent to client lists and cards. */
export interface FragranceSummary {
  id: string;
  slug: string;
  name: string;
  brand: string;
  concentration: Concentration;
  families: FragranceFamily[];
  topNotes: string[];
  accords: Accord[];
  priceFrom: number;
  priceFromSizeMl: number;
  currency: Currency;
  longevity: number;
  projection: number;
  versatility: number;
  seasons: Record<Season, number>;
  occasions: Record<Occasion, number>;
  sizes: number[];
  priceTier: PriceTier;
  rating: number;
  visual: BottleVisual;
  isSynthetic: boolean;
}
