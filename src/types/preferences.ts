import type {
  AttributeKey,
  Currency,
  FragranceFamily,
  Occasion,
  Season,
} from "./fragrance";

export type VersatilityPreference = "versatile" | "specific" | "no_preference";

/** Soft, characteristic-level dislikes ("not too sweet") as opposed to notes. */
export const DISLIKED_TRAITS = [
  "overly_sweet",
  "too_strong",
  "heavy_musk",
  "strong_leather",
  "smoky",
  "powdery",
  "very_floral",
] as const;
export type DislikedTrait = (typeof DISLIKED_TRAITS)[number];

/**
 * Explicit, user-stated preferences (quiz, profile editor, chatbot).
 * Hard restrictions (strict budget, excludedNotes) filter fragrances out;
 * everything else only affects scoring.
 */
export interface PreferenceProfile {
  budget: {
    min: number;
    max: number;
    currency: Currency;
    /** When true, fragrances above `max` are excluded, not just penalized. */
    strict: boolean;
  };
  families: FragranceFamily[];
  likedNotes: string[];
  occasions: Occasion[];
  seasons: Season[];
  /** 1 = skin scent … 5 = room-filling */
  strength: number;
  /** 1 = don't care … 5 = must last all day */
  longevityImportance: number;
  versatility: VersatilityPreference;
  /** Absolute exclusions: any fragrance containing these notes is removed. */
  excludedNotes: string[];
  /** Soft dislikes: penalized but still eligible. */
  dislikedNotes: string[];
  dislikedTraits: DislikedTrait[];
}

export const FEEDBACK_TYPES = [
  "love",
  "not_interested",
  "own",
  "too_expensive",
  "too_sweet",
  "too_strong",
] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

export interface FeedbackEvent {
  fragranceId: string;
  type: FeedbackType;
  createdAt: string;
}

/**
 * Transparent, derived preference adjustments learned from feedback.
 * Always recomputed from the feedback log, so removing feedback undoes it.
 */
export interface PreferenceAdjustments {
  /** -1 … 1 per note id */
  noteWeights: Record<string, number>;
  /** -1 … 1 per family */
  familyWeights: Partial<Record<FragranceFamily, number>>;
  /** Learned upper limits on perceptual attributes (0–10). */
  attributeCaps: Partial<Record<AttributeKey, number>>;
  /** Learned soft upper limit on projection (1–10). */
  projectionCap: number | null;
  /** Learned soft price ceiling. */
  softPriceCeiling: number | null;
  /** Fragrances the user doesn't want to see again. */
  hiddenFragranceIds: string[];
  lovedFragranceIds: string[];
  ownedFragranceIds: string[];
}

export interface WishlistItem {
  fragranceId: string;
  addedAt: string;
  note: string | null;
}

export interface CollectionItem {
  fragranceId: string;
  addedAt: string;
  isFavorite: boolean;
  /** 1–5 */
  rating: number | null;
  personalNotes: string | null;
  sizeMl: number | null;
}
