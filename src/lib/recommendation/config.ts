/**
 * Tunable engine parameters. Weights are a starting point, not a law: every
 * public engine function accepts overrides so they can be A/B tested or
 * personalized later without touching scoring code.
 */

export const ENGINE_VERSION = "1.0.0";

export interface ScoringWeights {
  scent: number;
  occasion: number;
  budget: number;
  season: number;
  strength: number;
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  scent: 0.35,
  occasion: 0.25,
  budget: 0.2,
  season: 0.1,
  strength: 0.1,
};

/** Component score used when the user expressed no preference for that dimension. */
export const NEUTRAL_SCORE = 0.7;

export const SCENT = {
  /** Share of the scent score coming from family match vs. note match. */
  familyShare: 0.5,
  noteShare: 0.5,
  /** Maximum boost/penalty from learned feedback adjustments. */
  learnedInfluence: 0.18,
  /** Penalty per softly disliked note, scaled by how prominent the note is. */
  dislikedNotePenalty: 0.14,
  maxDislikePenalty: 0.45,
  /** Penalty per unit an attribute exceeds a disliked-trait threshold. */
  traitPenaltyPerPoint: 0.06,
};

export const BUDGET = {
  /** Score when a fragrance is cheaper than the stated minimum. */
  belowMinimumScore: 0.85,
  /** How fast the score decays per 100% over a non-strict maximum. */
  overBudgetDecay: 2,
};

/** Projection (1–10) each strength preference (1–5) aims for. */
export const STRENGTH_TARGET: Record<number, number> = {
  1: 2.5,
  2: 4,
  3: 5.5,
  4: 7,
  5: 8.75,
};

export const DIVERSITY = {
  /** MMR trade-off: 1 = pure relevance, 0 = pure diversity. */
  lambda: 0.72,
};
