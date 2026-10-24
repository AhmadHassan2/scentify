import {
  ATTRIBUTE_KEYS,
  FRAGRANCE_FAMILIES,
  OCCASIONS,
  SEASONS,
  type AttributeKey,
  type Fragrance,
  type FragranceFamily,
  type Occasion,
  type Season,
} from "@/types/fragrance";
import type {
  CollectionItem,
  PreferenceAdjustments,
  PreferenceProfile,
} from "@/types/preferences";
import { allNoteIds, entryPrice } from "@/lib/fragrance/utils";
import { STRENGTH_TARGET } from "./config";

/**
 * Fragrance DNA: a readable summary of taste, blended from three sources —
 * stated preferences (quiz/profile), learned feedback, and the collection.
 */

export interface FragranceDNA {
  title: string;
  summary: string;
  families: Array<{ family: FragranceFamily; score: number }>;
  topNotes: Array<{ id: string; score: number }>;
  dislikedNotes: string[];
  excludedNotes: string[];
  attributes: Record<AttributeKey, number>;
  seasons: Record<Season, number>;
  occasions: Record<Occasion, number>;
  projection: { target: number; strength: number };
  budget: { min: number; max: number; strict: boolean; typicalOwned: number | null };
  sources: { stated: boolean; feedbackCount: number; collectionCount: number };
}

const ADJECTIVE: Record<FragranceFamily, string> = {
  citrus: "Sunlit", aquatic: "Coastal", aromatic: "Herbal", green: "Verdant",
  floral: "Floral", fruity: "Juicy", woody: "Woody", spicy: "Spiced",
  amber: "Amber", gourmand: "Gourmand", leather: "Leather", smoky: "Smoky", musky: "Soft",
};
const NOUN: Record<FragranceFamily, string> = {
  citrus: "Citrus", aquatic: "Tides", aromatic: "Herbs", green: "Greens",
  floral: "Petals", fruity: "Orchard", woody: "Woods", spicy: "Spice",
  amber: "Resins", gourmand: "Sweets", leather: "Leathers", smoky: "Embers", musky: "Musks",
};

function normalize<K extends string>(record: Record<K, number>): Record<K, number> {
  const max = Math.max(...Object.values<number>(record), 0);
  if (max <= 0) return record;
  return Object.fromEntries(
    Object.entries<number>(record).map(([k, v]) => [k, Math.round((v / max) * 100) / 100]),
  ) as Record<K, number>;
}

export function buildFragranceDNA(input: {
  profile: PreferenceProfile;
  adjustments?: PreferenceAdjustments;
  collection?: Array<{ item: CollectionItem; fragrance: Fragrance }>;
  feedbackCount?: number;
}): FragranceDNA {
  const { profile, adjustments, collection = [], feedbackCount = 0 } = input;

  const familyRaw = Object.fromEntries(FRAGRANCE_FAMILIES.map((f) => [f, 0])) as Record<FragranceFamily, number>;
  profile.families.forEach((f) => (familyRaw[f] += 1));
  for (const [f, w] of Object.entries(adjustments?.familyWeights ?? {})) {
    familyRaw[f as FragranceFamily] += (w ?? 0) * 1.5;
  }

  const noteRaw: Record<string, number> = {};
  profile.likedNotes.forEach((n) => (noteRaw[n] = (noteRaw[n] ?? 0) + 1));
  for (const [n, w] of Object.entries(adjustments?.noteWeights ?? {})) {
    noteRaw[n] = (noteRaw[n] ?? 0) + w * 1.5;
  }

  const attrSum = Object.fromEntries(ATTRIBUTE_KEYS.map((k) => [k, 0])) as Record<AttributeKey, number>;
  const seasonRaw = Object.fromEntries(SEASONS.map((s) => [s, profile.seasons.includes(s) ? 1 : 0])) as Record<Season, number>;
  const occasionRaw = Object.fromEntries(OCCASIONS.map((o) => [o, profile.occasions.includes(o) ? 1 : 0])) as Record<Occasion, number>;
  let attrWeight = 0;
  const ownedPrices: number[] = [];

  for (const { item, fragrance } of collection) {
    const w = 0.5 + (item.isFavorite ? 0.5 : 0) + (item.rating ? (item.rating - 3) * 0.25 : 0);
    if (w <= 0) continue;
    fragrance.families.forEach((f, i) => (familyRaw[f] += w * (i === 0 ? 0.6 : 0.3)));
    allNoteIds(fragrance).slice(0, 6).forEach((n) => (noteRaw[n] = (noteRaw[n] ?? 0) + w * 0.3));
    ATTRIBUTE_KEYS.forEach((k) => (attrSum[k] += fragrance.attributes[k] * w));
    SEASONS.forEach((s) => (seasonRaw[s] += fragrance.seasons[s] * w * 0.5));
    OCCASIONS.forEach((o) => (occasionRaw[o] += fragrance.occasions[o] * w * 0.5));
    attrWeight += w;
    ownedPrices.push(entryPrice(fragrance));
  }

  const families = normalize(familyRaw);
  const rankedFamilies = FRAGRANCE_FAMILIES.map((family) => ({ family, score: Math.max(0, families[family]) }))
    .sort((a, b) => b.score - a.score);
  const disliked = new Set([...profile.dislikedNotes, ...profile.excludedNotes]);
  const topNotes = Object.entries(noteRaw)
    .filter(([id, s]) => s > 0 && !disliked.has(id))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, score]) => ({ id, score: Math.round(score * 100) / 100 }));

  const attributes = Object.fromEntries(
    ATTRIBUTE_KEYS.map((k) => [k, attrWeight ? Math.round((attrSum[k] / attrWeight) * 10) / 10 : 0]),
  ) as Record<AttributeKey, number>;

  const [first, second] = rankedFamilies.filter((f) => f.score > 0);
  const title = first
    ? second
      ? `${ADJECTIVE[first.family]} ${NOUN[second.family]}`
      : `${ADJECTIVE[first.family]} Signature`
    : "Still Exploring";
  const summary = first
    ? `You gravitate toward ${first.family}${second ? ` and ${second.family}` : ""} scents with ${
        profile.strength >= 4 ? "bold" : profile.strength <= 2 ? "intimate" : "balanced"
      } projection.`
    : "Take the quiz, react to fragrances, or build your collection to reveal your fragrance DNA.";

  ownedPrices.sort((a, b) => a - b);
  return {
    title,
    summary,
    families: rankedFamilies,
    topNotes,
    dislikedNotes: profile.dislikedNotes,
    excludedNotes: profile.excludedNotes,
    attributes,
    seasons: normalize(seasonRaw),
    occasions: normalize(occasionRaw),
    projection: { target: STRENGTH_TARGET[Math.round(profile.strength)] ?? 5.5, strength: profile.strength },
    budget: {
      min: profile.budget.min,
      max: profile.budget.max,
      strict: profile.budget.strict,
      typicalOwned: ownedPrices.length ? ownedPrices[Math.floor(ownedPrices.length / 2)] : null,
    },
    sources: {
      stated: profile.families.length + profile.likedNotes.length > 0,
      feedbackCount,
      collectionCount: collection.length,
    },
  };
}
