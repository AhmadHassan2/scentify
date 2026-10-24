import type { Fragrance, FragranceFamily } from "@/types/fragrance";
import type { PreferenceAdjustments, PreferenceProfile } from "@/types/preferences";
import { familyAffinity } from "@/lib/fragrance/families";
import { noteSimilarity } from "@/lib/fragrance/notes";
import { DISLIKED_TRAIT_META } from "@/lib/fragrance/taxonomy";
import { clamp, entryPrice, weightedNotes } from "@/lib/fragrance/utils";
import {
  BUDGET,
  DEFAULT_WEIGHTS,
  NEUTRAL_SCORE,
  SCENT,
  STRENGTH_TARGET,
  type ScoringWeights,
} from "./config";
import type { ScoreComponents } from "./types";

/** Weight of a fragrance's 1st, 2nd, 3rd… family. */
const FAMILY_POSITION_WEIGHT = [1, 0.75, 0.55, 0.4];

function mean(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

export function familyMatch(
  fragranceFamilies: FragranceFamily[],
  userFamilies: FragranceFamily[],
): number {
  if (userFamilies.length === 0) return NEUTRAL_SCORE;
  const bests = userFamilies.map((u) =>
    Math.max(
      ...fragranceFamilies.map(
        (ff, i) => familyAffinity(u, ff) * (FAMILY_POSITION_WEIGHT[i] ?? 0.3),
      ),
    ),
  );
  // Half "how well does it hit your favourite", half "how well does it cover all of them".
  return 0.5 * Math.max(...bests) + 0.5 * mean(bests);
}

export interface NoteMatch {
  score: number;
  /** Liked notes literally present in the fragrance. */
  matched: string[];
}

export function noteMatch(fragrance: Fragrance, likedNotes: string[]): NoteMatch {
  if (likedNotes.length === 0) return { score: NEUTRAL_SCORE, matched: [] };
  const notes = weightedNotes(fragrance);
  const present = new Set(notes.map((n) => n.id));
  const bests = likedNotes.map((liked) => {
    let best = 0;
    for (const n of notes) {
      const prominence = 0.7 + 0.3 * Math.min(1, n.weight / 1.1);
      best = Math.max(best, noteSimilarity(liked, n.id) * prominence);
    }
    return best;
  });
  const sorted = [...bests].sort((a, b) => b - a);
  const top = sorted.slice(0, Math.min(3, sorted.length));
  return {
    score: clamp(0.7 * mean(top) + 0.3 * mean(bests)),
    matched: likedNotes.filter((id) => present.has(id)),
  };
}

/** Signed influence (-learnedInfluence … +learnedInfluence) of feedback learning. */
export function learnedAdjustment(
  fragrance: Fragrance,
  adjustments: PreferenceAdjustments | undefined,
): number {
  if (!adjustments) return 0;
  let raw = 0;
  for (const n of weightedNotes(fragrance)) {
    raw += (adjustments.noteWeights[n.id] ?? 0) * n.weight;
  }
  raw /= 1.5;
  fragrance.families.forEach((family, i) => {
    raw += (adjustments.familyWeights[family] ?? 0) * (FAMILY_POSITION_WEIGHT[i] ?? 0.3);
  });
  return Math.tanh(raw) * SCENT.learnedInfluence;
}

export interface DislikeAssessment {
  penalty: number;
  notesPresent: string[];
  /** Human-readable labels of traits that were triggered. */
  traitsTriggered: string[];
}

export function assessDislikes(
  fragrance: Fragrance,
  profile: PreferenceProfile,
  adjustments?: PreferenceAdjustments,
): DislikeAssessment {
  const disliked = new Set(profile.dislikedNotes);
  const notesPresent: string[] = [];
  let notePenalty = 0;
  for (const n of weightedNotes(fragrance)) {
    if (disliked.has(n.id)) {
      notesPresent.push(n.id);
      notePenalty += SCENT.dislikedNotePenalty * Math.min(1.2, n.weight / 0.9);
    }
  }

  const traitsTriggered: string[] = [];
  let traitPenalty = 0;
  for (const trait of profile.dislikedTraits) {
    const meta = DISLIKED_TRAIT_META[trait];
    const value =
      meta.attribute === "projection" ? fragrance.projection : fragrance.attributes[meta.attribute];
    if (value > meta.threshold) {
      traitsTriggered.push(meta.label);
      traitPenalty += (value - meta.threshold + 1) * SCENT.traitPenaltyPerPoint;
    }
  }
  for (const [attr, cap] of Object.entries(adjustments?.attributeCaps ?? {})) {
    const value = fragrance.attributes[attr as keyof Fragrance["attributes"]];
    if (cap !== undefined && value > cap) {
      traitPenalty += (value - cap) * SCENT.traitPenaltyPerPoint;
      if (attr === "sweetness") traitsTriggered.push("Sweeter than you've liked");
    }
  }

  return {
    penalty: Math.min(SCENT.maxDislikePenalty, notePenalty) + Math.min(0.35, traitPenalty),
    notesPresent,
    traitsTriggered: [...new Set(traitsTriggered)],
  };
}

export interface ScentScore {
  score: number;
  family: number;
  notes: number;
  learned: number;
  matchedNotes: string[];
  dislikes: DislikeAssessment;
}

export function scoreScent(
  fragrance: Fragrance,
  profile: PreferenceProfile,
  adjustments?: PreferenceAdjustments,
): ScentScore {
  const family = familyMatch(fragrance.families, profile.families);
  const notes = noteMatch(fragrance, profile.likedNotes);
  const hasFamilies = profile.families.length > 0;
  const hasNotes = profile.likedNotes.length > 0;

  let base: number;
  if (hasFamilies && hasNotes) base = SCENT.familyShare * family + SCENT.noteShare * notes.score;
  else if (hasFamilies) base = family;
  else if (hasNotes) base = notes.score;
  else base = NEUTRAL_SCORE;

  const learned = learnedAdjustment(fragrance, adjustments);
  const dislikes = assessDislikes(fragrance, profile, adjustments);
  return {
    score: clamp(base + learned - dislikes.penalty),
    family,
    notes: notes.score,
    learned,
    matchedNotes: notes.matched,
    dislikes,
  };
}

export function scoreOccasion(fragrance: Fragrance, profile: PreferenceProfile): number {
  const versatility = fragrance.versatility / 10;
  if (profile.occasions.length === 0) {
    return profile.versatility === "versatile"
      ? 0.5 * NEUTRAL_SCORE + 0.5 * versatility
      : NEUTRAL_SCORE;
  }
  const values = profile.occasions.map((o) => fragrance.occasions[o]);
  const base = 0.7 * mean(values) + 0.3 * Math.min(...values);
  if (profile.versatility === "versatile") return clamp(0.75 * base + 0.25 * versatility);
  if (profile.versatility === "specific") return clamp(0.75 * base + 0.25 * Math.max(...values));
  return clamp(base);
}

export function scoreBudget(
  fragrance: Fragrance,
  profile: PreferenceProfile,
  adjustments?: PreferenceAdjustments,
): number {
  const price = entryPrice(fragrance);
  const { min, max } = profile.budget;
  let score = 1;
  if (max > 0 && price > max) {
    score = clamp(1 - ((price - max) / max) * BUDGET.overBudgetDecay);
  } else if (min > 0 && price < min) {
    score = BUDGET.belowMinimumScore;
  }
  const ceiling = adjustments?.softPriceCeiling;
  if (ceiling && price > ceiling) {
    score *= clamp(1 - ((price - ceiling) / ceiling) * 1.5, 0.3, 1);
  }
  return score;
}

export function scoreSeason(fragrance: Fragrance, profile: PreferenceProfile): number {
  if (profile.seasons.length === 0) return NEUTRAL_SCORE;
  return mean(profile.seasons.map((s) => fragrance.seasons[s]));
}

export function projectionFit(projection: number, strength: number): number {
  const target = STRENGTH_TARGET[Math.round(clamp(strength, 1, 5))];
  return clamp(1 - Math.abs(projection - target) / 6);
}

export function scoreStrength(
  fragrance: Fragrance,
  profile: PreferenceProfile,
  adjustments?: PreferenceAdjustments,
): number {
  const projection = projectionFit(fragrance.projection, profile.strength);
  const importance = (clamp(profile.longevityImportance, 1, 5) - 1) / 4;
  const longevity = (1 - importance) * 0.75 + importance * (fragrance.longevity / 10);
  let score = 0.55 * projection + 0.45 * longevity;
  const cap = adjustments?.projectionCap;
  if (cap && fragrance.projection > cap) score -= (fragrance.projection - cap) * 0.12;
  return clamp(score);
}

export function combineComponents(
  components: ScoreComponents,
  weights: Partial<ScoringWeights> = {},
): number {
  const w = { ...DEFAULT_WEIGHTS, ...weights };
  const total = w.scent + w.occasion + w.budget + w.season + w.strength;
  if (total <= 0) return 0;
  return (
    (w.scent * components.scent +
      w.occasion * components.occasion +
      w.budget * components.budget +
      w.season * components.season +
      w.strength * components.strength) /
    total
  );
}
