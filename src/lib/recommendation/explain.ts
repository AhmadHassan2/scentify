import type { Fragrance } from "@/types/fragrance";
import type { PreferenceProfile } from "@/types/preferences";
import { familyAffinity } from "@/lib/fragrance/families";
import { noteName } from "@/lib/fragrance/notes";
import {
  FAMILY_META,
  OCCASION_META,
  SEASON_META,
  formatPrice,
  performanceLabel,
} from "@/lib/fragrance/taxonomy";
import { cheapestVariant, entryPrice } from "@/lib/fragrance/utils";
import { STRENGTH_TARGET } from "./config";
import type { ScentScore } from "./scoring";
import type { Explanation } from "./types";

/** "a woody scent" / "an aromatic scent" */
export function withArticle(word: string): string {
  return `${/^[aeiou]/i.test(word) ? "an" : "a"} ${word}`;
}

export function listNames(items: string[], max = 3): string {
  const shown = items.slice(0, max);
  if (shown.length <= 1) return shown.join("");
  return `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}`;
}

/** Build human-readable reasons from the same numbers that produced the score. */
export function explain(
  fragrance: Fragrance,
  profile: PreferenceProfile,
  scent: ScentScore,
): Explanation {
  const reasons: string[] = [];
  const cautions: string[] = [];
  const primary = fragrance.families[0];

  // Scent
  if (profile.families.includes(primary)) {
    const label = withArticle(FAMILY_META[primary].label.toLowerCase());
    reasons.push(`${label[0].toUpperCase()}${label.slice(1)} scent — right in the families you're after`);
  } else if (profile.families.length) {
    const close = profile.families
      .map((u) => ({ u, a: familyAffinity(u, primary) }))
      .sort((a, b) => b.a - a.a)[0];
    const secondaryHit = fragrance.families.slice(1).find((f) => profile.families.includes(f));
    if (secondaryHit) {
      reasons.push(`${FAMILY_META[primary].label} with ${withArticle(FAMILY_META[secondaryHit].label.toLowerCase())} side you enjoy`);
    } else if (close && close.a >= 0.5) {
      reasons.push(`${FAMILY_META[primary].label} character, close to your love of ${FAMILY_META[close.u].label.toLowerCase()}`);
    }
  }
  if (scent.matchedNotes.length) {
    reasons.push(`Features ${listNames(scent.matchedNotes.map(noteName))} — notes you love`);
  } else if (profile.likedNotes.length && scent.notes >= 0.55) {
    reasons.push("Built from notes closely related to the ones you like");
  }
  if (scent.learned > 0.035) reasons.push("Shares DNA with fragrances you've loved");

  // Occasion
  const strongOccasions = profile.occasions.filter((o) => fragrance.occasions[o] >= 0.75);
  if (strongOccasions.length) {
    reasons.push(`Excellent for ${listNames(strongOccasions.map((o) => OCCASION_META[o].label.toLowerCase()))}`);
  }
  if (profile.versatility === "versatile" && fragrance.versatility >= 7.5) {
    reasons.push(`Highly versatile (${fragrance.versatility}/10) across settings`);
  }
  for (const o of profile.occasions) {
    if (fragrance.occasions[o] < 0.4) cautions.push(`Less suited to ${OCCASION_META[o].label.toLowerCase()}`);
  }

  // Budget
  const price = entryPrice(fragrance);
  const variant = cheapestVariant(fragrance);
  if (profile.budget.max > 0 && price <= profile.budget.max) {
    reasons.push(`From ${formatPrice(price)} (${variant.sizeMl} ml) — within your budget`);
  } else if (profile.budget.max > 0 && price > profile.budget.max) {
    cautions.push(`${formatPrice(price - profile.budget.max)} over your budget`);
  }

  // Season
  const goodSeasons = profile.seasons.filter((s) => fragrance.seasons[s] >= 0.7);
  if (goodSeasons.length) {
    reasons.push(`Shines in ${listNames(goodSeasons.map((s) => SEASON_META[s].label.toLowerCase()))}`);
  }
  for (const s of profile.seasons) {
    if (fragrance.seasons[s] < 0.35) cautions.push(`Not ideal for ${SEASON_META[s].label.toLowerCase()}`);
  }

  // Strength
  const target = STRENGTH_TARGET[Math.round(profile.strength)] ?? 5.5;
  const diff = fragrance.projection - target;
  if (Math.abs(diff) <= 1.25) {
    reasons.push(`${performanceLabel(fragrance.projection)} projection, as you prefer`);
  } else if (diff > 2.5) {
    cautions.push("Projects more than you asked for");
  } else if (diff < -2.5) {
    cautions.push("Softer than you asked for");
  }
  if (profile.longevityImportance >= 4 && fragrance.longevity >= 8) {
    reasons.push(`Long-lasting (${fragrance.longevity}/10 longevity)`);
  } else if (profile.longevityImportance >= 4 && fragrance.longevity <= 4.5) {
    cautions.push(`Modest longevity (${fragrance.longevity}/10)`);
  }

  // Dislikes
  if (scent.dislikes.notesPresent.length) {
    cautions.unshift(
      `Contains ${listNames(scent.dislikes.notesPresent.map(noteName))}, which you'd rather avoid`,
    );
  }
  for (const label of scent.dislikes.traitsTriggered) cautions.push(label);

  return { reasons: reasons.slice(0, 5), cautions: [...new Set(cautions)].slice(0, 3) };
}
