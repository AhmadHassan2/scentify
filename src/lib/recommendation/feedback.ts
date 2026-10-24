import type { Fragrance } from "@/types/fragrance";
import type {
  FeedbackEvent,
  FeedbackType,
  PreferenceAdjustments,
} from "@/types/preferences";
import { clamp, entryPrice, weightedNotes } from "@/lib/fragrance/utils";
import { emptyAdjustments } from "./defaults";

/**
 * Transparent preference learning.
 *
 * Adjustments are *derived* by replaying the feedback log in order, so every
 * learned weight can be traced back to a specific click, and removing a piece
 * of feedback cleanly undoes its effect. No hidden model state.
 */

export const FEEDBACK_META: Record<FeedbackType, { label: string; effect: string }> = {
  love: { label: "Love it", effect: "Boosts its notes and families in future matches" },
  not_interested: { label: "Not interested", effect: "Hides it and slightly lowers similar notes" },
  own: { label: "Already own it", effect: "Stops recommending it as something new" },
  too_expensive: { label: "Too expensive", effect: "Sets a soft price ceiling below this price" },
  too_sweet: { label: "Too sweet", effect: "Penalizes fragrances at least this sweet" },
  too_strong: { label: "Too strong", effect: "Penalizes fragrances projecting this much" },
};

const NOTE_STEP = { love: 0.18, not_interested: -0.1 };
const FAMILY_STEP = { love: 0.22, not_interested: -0.12 };

export function applyFeedback(
  adjustments: PreferenceAdjustments,
  fragrance: Fragrance,
  type: FeedbackType,
): PreferenceAdjustments {
  const next: PreferenceAdjustments = {
    ...adjustments,
    noteWeights: { ...adjustments.noteWeights },
    familyWeights: { ...adjustments.familyWeights },
    attributeCaps: { ...adjustments.attributeCaps },
  };

  switch (type) {
    case "love":
    case "not_interested": {
      for (const n of weightedNotes(fragrance)) {
        const step = NOTE_STEP[type] * Math.min(1, n.weight);
        next.noteWeights[n.id] = clamp((next.noteWeights[n.id] ?? 0) + step, -1, 1);
      }
      fragrance.families.slice(0, 2).forEach((family, i) => {
        const step = FAMILY_STEP[type] * (i === 0 ? 1 : 0.6);
        next.familyWeights[family] = clamp((next.familyWeights[family] ?? 0) + step, -1, 1);
      });
      if (type === "love") next.lovedFragranceIds = [...new Set([...next.lovedFragranceIds, fragrance.id])];
      else next.hiddenFragranceIds = [...new Set([...next.hiddenFragranceIds, fragrance.id])];
      break;
    }
    case "own":
      next.ownedFragranceIds = [...new Set([...next.ownedFragranceIds, fragrance.id])];
      break;
    case "too_expensive": {
      const ceiling = Math.round(entryPrice(fragrance) * 0.85);
      next.softPriceCeiling = next.softPriceCeiling ? Math.min(next.softPriceCeiling, ceiling) : ceiling;
      break;
    }
    case "too_sweet": {
      const cap = Math.max(1, fragrance.attributes.sweetness - 1);
      const current = next.attributeCaps.sweetness;
      next.attributeCaps.sweetness = current === undefined ? cap : Math.min(current, cap);
      break;
    }
    case "too_strong": {
      const cap = Math.max(2, fragrance.projection - 1);
      next.projectionCap = next.projectionCap ? Math.min(next.projectionCap, cap) : cap;
      break;
    }
  }
  return next;
}

export function deriveAdjustments(
  events: FeedbackEvent[],
  catalogById: Map<string, Fragrance>,
  ownedIds: string[] = [],
): PreferenceAdjustments {
  const ordered = [...events].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  let adjustments = emptyAdjustments();
  for (const event of ordered) {
    const fragrance = catalogById.get(event.fragranceId);
    if (fragrance) adjustments = applyFeedback(adjustments, fragrance, event.type);
  }
  adjustments.ownedFragranceIds = [...new Set([...adjustments.ownedFragranceIds, ...ownedIds])];
  return adjustments;
}
