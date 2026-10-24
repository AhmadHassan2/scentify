import type { Fragrance } from "@/types/fragrance";
import type { PreferenceAdjustments, PreferenceProfile } from "@/types/preferences";
import type { ScoringWeights } from "./config";

export interface ScoreComponents {
  scent: number;
  occasion: number;
  budget: number;
  season: number;
  strength: number;
}

export interface Explanation {
  /** Positive reasons, most important first. */
  reasons: string[];
  /** Trade-offs the user should know about. */
  cautions: string[];
}

export interface ScoredFragrance extends Explanation {
  fragrance: Fragrance;
  /** Weighted compatibility, 0–1. NOT a probability of satisfaction. */
  score: number;
  /** score × 100, rounded, for display ("92% match"). */
  matchPercent: number;
  components: ScoreComponents;
  /** Liked notes found in the fragrance. */
  matchedNotes: string[];
  /** Softly disliked notes found in the fragrance. */
  dislikedNotesPresent: string[];
}

export type ExclusionReason =
  | { kind: "over_budget"; price: number; max: number }
  | { kind: "excluded_note"; noteId: string }
  | { kind: "owned" }
  | { kind: "hidden" }
  | { kind: "explicit" };

export interface Exclusion {
  fragranceId: string;
  reason: ExclusionReason;
}

export interface FilterResult {
  eligible: Fragrance[];
  excluded: Exclusion[];
}

export interface RecommendContext {
  adjustments?: PreferenceAdjustments;
  /** Remove fragrances the user already owns (default true). */
  excludeOwned?: boolean;
  /** Ids that must never appear (e.g. the fragrance being viewed). */
  excludeIds?: string[];
}

export interface RecommendOptions extends RecommendContext {
  limit?: number;
  weights?: Partial<ScoringWeights>;
  /** Re-rank the top candidates for variety (MMR). */
  diversify?: boolean;
}

export interface RecommendationResponse {
  results: ScoredFragrance[];
  /** Total eligible fragrances before the limit was applied. */
  totalEligible: number;
  excludedSummary: {
    overBudget: number;
    excludedNotes: Record<string, number>;
    owned: number;
    hidden: number;
  };
  profile: PreferenceProfile;
  engineVersion: string;
}
