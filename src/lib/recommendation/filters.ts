import type { Fragrance } from "@/types/fragrance";
import type { PreferenceProfile } from "@/types/preferences";
import { allNoteIds, entryPrice } from "@/lib/fragrance/utils";
import type { Exclusion, FilterResult, RecommendContext } from "./types";

/**
 * Hard restrictions. These remove fragrances outright instead of lowering
 * their score, so a strict budget or an excluded note can never be "outvoted"
 * by a strong scent match.
 */
export function applyHardFilters(
  catalog: Fragrance[],
  profile: PreferenceProfile,
  context: RecommendContext = {},
): FilterResult {
  const eligible: Fragrance[] = [];
  const excluded: Exclusion[] = [];
  const excludedNotes = new Set(profile.excludedNotes);
  const explicit = new Set(context.excludeIds ?? []);
  const hidden = new Set(context.adjustments?.hiddenFragranceIds ?? []);
  const owned = new Set(
    context.excludeOwned === false ? [] : (context.adjustments?.ownedFragranceIds ?? []),
  );

  for (const f of catalog) {
    if (explicit.has(f.id)) {
      excluded.push({ fragranceId: f.id, reason: { kind: "explicit" } });
      continue;
    }
    if (owned.has(f.id)) {
      excluded.push({ fragranceId: f.id, reason: { kind: "owned" } });
      continue;
    }
    if (hidden.has(f.id)) {
      excluded.push({ fragranceId: f.id, reason: { kind: "hidden" } });
      continue;
    }
    if (profile.budget.strict) {
      const price = entryPrice(f);
      if (price > profile.budget.max) {
        excluded.push({
          fragranceId: f.id,
          reason: { kind: "over_budget", price, max: profile.budget.max },
        });
        continue;
      }
    }
    if (excludedNotes.size > 0) {
      const hit = allNoteIds(f).find((id) => excludedNotes.has(id));
      if (hit) {
        excluded.push({ fragranceId: f.id, reason: { kind: "excluded_note", noteId: hit } });
        continue;
      }
    }
    eligible.push(f);
  }

  return { eligible, excluded };
}

export function summarizeExclusions(excluded: Exclusion[]) {
  const summary = {
    overBudget: 0,
    excludedNotes: {} as Record<string, number>,
    owned: 0,
    hidden: 0,
  };
  for (const { reason } of excluded) {
    if (reason.kind === "over_budget") summary.overBudget++;
    else if (reason.kind === "excluded_note")
      summary.excludedNotes[reason.noteId] = (summary.excludedNotes[reason.noteId] ?? 0) + 1;
    else if (reason.kind === "owned") summary.owned++;
    else if (reason.kind === "hidden") summary.hidden++;
  }
  return summary;
}
