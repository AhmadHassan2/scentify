import type { Fragrance } from "@/types/fragrance";
import type { PreferenceAdjustments, PreferenceProfile } from "@/types/preferences";
import { ENGINE_VERSION, type ScoringWeights } from "./config";
import { mmr } from "./diversity";
import { explain } from "./explain";
import { applyHardFilters, summarizeExclusions } from "./filters";
import {
  combineComponents,
  scoreBudget,
  scoreOccasion,
  scoreScent,
  scoreSeason,
  scoreStrength,
} from "./scoring";
import type { RecommendOptions, RecommendationResponse, ScoredFragrance } from "./types";

/** Score a single fragrance against a profile. Does not apply hard filters. */
export function scoreFragrance(
  fragrance: Fragrance,
  profile: PreferenceProfile,
  adjustments?: PreferenceAdjustments,
  weights?: Partial<ScoringWeights>,
): ScoredFragrance {
  const scent = scoreScent(fragrance, profile, adjustments);
  const components = {
    scent: scent.score,
    occasion: scoreOccasion(fragrance, profile),
    budget: scoreBudget(fragrance, profile, adjustments),
    season: scoreSeason(fragrance, profile),
    strength: scoreStrength(fragrance, profile, adjustments),
  };
  const score = combineComponents(components, weights);
  const { reasons, cautions } = explain(fragrance, profile, scent);
  return {
    fragrance,
    score,
    matchPercent: Math.round(score * 100),
    components,
    reasons,
    cautions,
    matchedNotes: scent.matchedNotes,
    dislikedNotesPresent: scent.dislikes.notesPresent,
  };
}

export function compareScored(a: ScoredFragrance, b: ScoredFragrance): number {
  return (
    b.score - a.score ||
    b.fragrance.rating - a.fragrance.rating ||
    a.fragrance.name.localeCompare(b.fragrance.name)
  );
}

/**
 * The main entry point used by the quiz, budget finder, chatbot and profile.
 * Pipeline: hard filters → component scoring → ranking → optional diversity.
 */
export function recommend(
  catalog: Fragrance[],
  profile: PreferenceProfile,
  options: RecommendOptions = {},
): RecommendationResponse {
  const { limit = 12, weights, diversify = false, ...context } = options;
  const { eligible, excluded } = applyHardFilters(catalog, profile, context);
  const scored = eligible
    .map((f) => scoreFragrance(f, profile, context.adjustments, weights))
    .sort(compareScored);

  // MMR picks a varied set; we still present that set best-first.
  const results = diversify
    ? mmr(scored.slice(0, Math.max(limit * 3, 24)), (s) => s.score, (s) => s.fragrance, limit).sort(compareScored)
    : scored.slice(0, limit);

  return {
    results,
    totalEligible: eligible.length,
    excludedSummary: summarizeExclusions(excluded),
    profile,
    engineVersion: ENGINE_VERSION,
  };
}

/** Score an explicit list (e.g. a wishlist or comparison) without filtering anything out. */
export function scoreMany(
  fragrances: Fragrance[],
  profile: PreferenceProfile,
  adjustments?: PreferenceAdjustments,
): Record<string, ScoredFragrance> {
  return Object.fromEntries(
    fragrances.map((f) => [f.id, scoreFragrance(f, profile, adjustments)]),
  );
}
