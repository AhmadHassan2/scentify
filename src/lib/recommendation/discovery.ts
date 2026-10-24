import type { Fragrance, FragranceFamily } from "@/types/fragrance";
import type { PreferenceAdjustments, PreferenceProfile } from "@/types/preferences";
import { familyAffinity } from "@/lib/fragrance/families";
import { NOTE_BY_ID, noteName } from "@/lib/fragrance/notes";
import { FAMILY_META, formatPrice } from "@/lib/fragrance/taxonomy";
import { allNoteIds, clamp, entryPrice, pricePer100ml } from "@/lib/fragrance/utils";
import { isBlankProfile } from "./defaults";
import { mmr } from "./diversity";
import { scoreFragrance } from "./engine";
import { applyHardFilters } from "./filters";
import { fragranceSimilarity } from "./similarity";
import type { ScoredFragrance } from "./types";

/**
 * Discovery balances three forces per section:
 *   relevance  – the personal compatibility score from the main engine
 *   novelty    – distance from what the user already likes / owns
 *   quality    – rating, and for hidden gems, low popularity
 * then applies MMR so each shelf shows variety, and de-duplicates across shelves.
 */

export const DISCOVERY_SECTIONS = [
  "hidden_gems",
  "comfort_zone",
  "similar_favorites",
  "fresh",
  "warm_spicy",
  "luxury",
  "budget",
] as const;
export type DiscoverySectionId = (typeof DISCOVERY_SECTIONS)[number];

export interface DiscoveryItem {
  fragrance: Fragrance;
  matchPercent: number;
  reason: string;
}

export interface DiscoverySection {
  id: DiscoverySectionId;
  title: string;
  description: string;
  items: DiscoveryItem[];
  /** Shown when a section can't be populated, e.g. no favourites yet. */
  emptyHint?: string;
}

export interface DiscoveryInput {
  profile: PreferenceProfile;
  adjustments?: PreferenceAdjustments;
  /** Favourites from the collection plus "loved" feedback. */
  favoriteIds?: string[];
  perSection?: number;
}

function quality(f: Fragrance): number {
  return clamp((f.rating - 3) / 2);
}

/** The families the user gravitates to: stated, learned, and from favourites. */
function comfortFamilies(
  profile: PreferenceProfile,
  adjustments: PreferenceAdjustments | undefined,
  favorites: Fragrance[],
): FragranceFamily[] {
  const set = new Set<FragranceFamily>(profile.families);
  for (const [family, weight] of Object.entries(adjustments?.familyWeights ?? {})) {
    if ((weight ?? 0) > 0.15) set.add(family as FragranceFamily);
  }
  for (const f of favorites) set.add(f.families[0]);
  return [...set];
}

function topNotes(f: Fragrance, count = 2): string {
  return allNoteIds(f)
    .slice(0, 5)
    .filter((id) => NOTE_BY_ID[id])
    .slice(0, count)
    .map((id) => noteName(id).toLowerCase())
    .join(" and ");
}

export function discover(catalog: Fragrance[], input: DiscoveryInput): DiscoverySection[] {
  const { profile, adjustments, favoriteIds = [], perSection = 8 } = input;
  const byId = new Map(catalog.map((f) => [f.id, f]));
  const favorites = favoriteIds.map((id) => byId.get(id)).filter((f): f is Fragrance => !!f);

  const { eligible } = applyHardFilters(catalog, profile, {
    adjustments,
    excludeOwned: true,
    excludeIds: favoriteIds,
  });
  const scored = new Map<string, ScoredFragrance>(
    eligible.map((f) => [f.id, scoreFragrance(f, profile, adjustments)]),
  );
  const personal = (f: Fragrance) => scored.get(f.id)?.score ?? 0;
  const comfort = comfortFamilies(profile, adjustments, favorites);
  const blank = isBlankProfile(profile) && favorites.length === 0;
  const shown = new Set<string>();

  type Candidate = { fragrance: Fragrance; relevance: number; reason: string };
  const shelf = (candidates: Candidate[]): DiscoveryItem[] => {
    // Prefer fragrances not already shown on an earlier shelf.
    const fresh = candidates.filter((c) => !shown.has(c.fragrance.id));
    const pool = (fresh.length >= perSection ? fresh : candidates)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, perSection * 3);
    const picked = mmr(pool, (c) => c.relevance, (c) => c.fragrance, perSection).sort((a, b) => b.relevance - a.relevance);
    picked.forEach((c) => shown.add(c.fragrance.id));
    return picked.map((c) => ({
      fragrance: c.fragrance,
      matchPercent: scored.get(c.fragrance.id)?.matchPercent ?? 0,
      reason: c.reason,
    }));
  };

  const sections: DiscoverySection[] = [];

  // Hidden gems: highly rated, little known.
  sections.push({
    id: "hidden_gems",
    title: "Hidden Gems",
    description: "Highly rated, rarely talked about.",
    items: shelf(
      eligible
        .filter((f) => f.popularity < 38 && f.rating >= 4.2)
        .map((f) => ({
          fragrance: f,
          relevance: 0.45 * personal(f) + 0.4 * quality(f) + 0.15 * (1 - f.popularity / 100),
          reason: `Rated ${f.rating.toFixed(1)}/5 yet flies under the radar — ${topNotes(f)} done with real character.`,
        })),
    ),
  });

  // Outside the comfort zone: unfamiliar families with a "bridge" back to known taste.
  const likedGroups = new Set(
    profile.likedNotes.flatMap((id) => NOTE_BY_ID[id]?.groups ?? []),
  );
  sections.push({
    id: "comfort_zone",
    title: "Outside Your Comfort Zone",
    description: blank
      ? "Take the quiz and we'll pick departures from your usual style."
      : "New territory, with a familiar thread to hold onto.",
    items: shelf(
      eligible
        .map((f) => {
          const closeness = comfort.length
            ? Math.max(...comfort.map((c) => familyAffinity(c, f.families[0])))
            : 0.5;
          const bridge = allNoteIds(f).find((id) =>
            profile.likedNotes.includes(id) || NOTE_BY_ID[id]?.groups.some((g) => likedGroups.has(g)),
          );
          const novelty = 1 - closeness;
          const s = scored.get(f.id);
          const practical = s ? (s.components.budget + s.components.occasion) / 2 : 0.5;
          return { f, novelty, bridge, practical };
        })
        .filter((c) => c.novelty >= 0.5)
        .map(({ f, novelty, bridge, practical }) => ({
          fragrance: f,
          relevance: 0.4 * novelty + 0.3 * quality(f) + 0.15 * practical + (bridge ? 0.15 : 0),
          reason: bridge
            ? `A ${FAMILY_META[f.families[0]].label.toLowerCase()} departure that keeps ${noteName(bridge).toLowerCase()} as a familiar anchor.`
            : `Explores ${FAMILY_META[f.families[0]].label.toLowerCase()}, a direction you haven't leaned into yet.`,
        })),
    ),
  });

  // Similar to favourites.
  const similarCandidates: Candidate[] = [];
  for (const fav of favorites.slice(0, 6)) {
    for (const f of eligible) {
      const sim = fragranceSimilarity(fav, f);
      if (sim.score < 0.6) continue;
      const shared = sim.sharedNotes.slice(0, 2).map((id) => noteName(id).toLowerCase());
      similarCandidates.push({
        fragrance: f,
        relevance: 0.6 * sim.score + 0.4 * personal(f),
        reason: `Because you love ${fav.name}${shared.length ? `: shares ${shared.join(" and ")}` : ": a closely related profile"}.`,
      });
    }
  }
  const bestSimilar = new Map<string, Candidate>();
  for (const c of similarCandidates) {
    const prev = bestSimilar.get(c.fragrance.id);
    if (!prev || prev.relevance < c.relevance) bestSimilar.set(c.fragrance.id, c);
  }
  sections.push({
    id: "similar_favorites",
    title: "Similar to Your Favourites",
    description: "Close relatives of the scents you already love.",
    items: shelf([...bestSimilar.values()]),
    emptyHint: favorites.length
      ? undefined
      : "Mark favourites in your collection or tap “Love it” on fragrances to fill this shelf.",
  });

  sections.push({
    id: "fresh",
    title: "Fresh Discoveries",
    description: "Citrus, sea air and green crispness.",
    items: shelf(
      eligible
        .filter((f) => f.attributes.freshness >= 6.5)
        .map((f) => ({
          fragrance: f,
          relevance: 0.75 * personal(f) + 0.25 * quality(f),
          reason: `Freshness ${f.attributes.freshness}/10 — ${topNotes(f)} for clear-headed days.`,
        })),
    ),
  });

  sections.push({
    id: "warm_spicy",
    title: "Warm & Spicy",
    description: "Resins, spice and glowing woods for cooler nights.",
    items: shelf(
      eligible
        .filter((f) => (f.attributes.warmth + f.attributes.spiciness) / 2 >= 5)
        .map((f) => ({
          fragrance: f,
          relevance: 0.75 * personal(f) + 0.25 * quality(f),
          reason: `Built on ${topNotes(f)}, with ${f.longevity >= 7.5 ? "serious staying power" : "a soft, warm glow"}.`,
        })),
    ),
  });

  sections.push({
    id: "luxury",
    title: "Luxury Picks",
    description: "Niche and prestige compositions worth the splurge.",
    items: shelf(
      eligible
        .filter((f) => f.priceTier === "luxury" || f.priceTier === "niche")
        .map((f) => {
          const s = scored.get(f.id);
          // Ignore the budget component here — the shelf is explicitly a splurge.
          const taste = s ? (s.components.scent * 0.6 + s.components.occasion * 0.25 + s.components.season * 0.15) : 0.5;
          return {
            fragrance: f,
            relevance: 0.65 * taste + 0.35 * quality(f),
            reason: `${f.concentration === "Extrait" || f.concentration === "Parfum" ? "Rich concentration" : "Refined composition"} from ${f.brand}, rated ${f.rating.toFixed(1)}/5.`,
          };
        }),
    ),
  });

  sections.push({
    id: "budget",
    title: "Budget-Friendly Finds",
    description: "Big character, gentle price.",
    items: shelf(
      eligible
        .filter((f) => entryPrice(f) <= 90)
        .map((f) => ({
          fragrance: f,
          relevance: 0.7 * personal(f) + 0.3 * quality(f),
          reason: `From ${formatPrice(entryPrice(f))} — about ${formatPrice(pricePer100ml(f))} per 100 ml.`,
        })),
    ),
  });

  return sections;
}
