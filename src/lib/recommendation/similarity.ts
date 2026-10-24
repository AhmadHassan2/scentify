import type { Fragrance } from "@/types/fragrance";
import { familyAffinity } from "@/lib/fragrance/families";
import { noteName, noteSimilarity } from "@/lib/fragrance/notes";
import { ATTRIBUTE_KEYS } from "@/types/fragrance";
import { clamp, entryPrice, weightedNotes } from "@/lib/fragrance/utils";

export interface SimilarityBreakdown {
  score: number;
  notes: number;
  accords: number;
  families: number;
  attributes: number;
  sharedNotes: string[];
}

export const SIMILARITY_WEIGHTS = { notes: 0.4, accords: 0.25, families: 0.15, attributes: 0.2 };

function directionalNoteSimilarity(a: Fragrance, b: Fragrance): number {
  const an = weightedNotes(a);
  const bn = weightedNotes(b);
  let num = 0;
  let den = 0;
  for (const x of an) {
    let best = 0;
    for (const y of bn) best = Math.max(best, noteSimilarity(x.id, y.id));
    num += best * x.weight;
    den += x.weight;
  }
  return den ? num / den : 0;
}

function accordCosine(a: Fragrance, b: Fragrance): number {
  const av = new Map(a.accords.map((x) => [x.id, x.strength]));
  const bv = new Map(b.accords.map((x) => [x.id, x.strength]));
  let dot = 0;
  for (const [k, v] of av) dot += v * (bv.get(k) ?? 0);
  const norm = (m: Map<string, number>) => Math.sqrt([...m.values()].reduce((s, v) => s + v * v, 0));
  const d = norm(av) * norm(bv);
  return d ? dot / d : 0;
}

function directionalFamily(a: Fragrance, b: Fragrance): number {
  const weights = [1, 0.7, 0.5, 0.35];
  let num = 0;
  let den = 0;
  a.families.forEach((fa, i) => {
    const w = weights[i] ?? 0.3;
    num += w * Math.max(...b.families.map((fb) => familyAffinity(fa, fb)));
    den += w;
  });
  return den ? num / den : 0;
}

function attributeSimilarity(a: Fragrance, b: Fragrance): number {
  const diff =
    ATTRIBUTE_KEYS.reduce((s, k) => s + Math.abs(a.attributes[k] - b.attributes[k]), 0) /
    ATTRIBUTE_KEYS.length;
  return clamp(1 - diff / 4);
}

/** Content-based similarity between two fragrances (0–1, symmetric). */
export function fragranceSimilarity(a: Fragrance, b: Fragrance): SimilarityBreakdown {
  const notes = (directionalNoteSimilarity(a, b) + directionalNoteSimilarity(b, a)) / 2;
  const accords = accordCosine(a, b);
  const families = (directionalFamily(a, b) + directionalFamily(b, a)) / 2;
  const attributes = attributeSimilarity(a, b);
  const bNotes = new Set([...b.notes.top, ...b.notes.middle, ...b.notes.base]);
  const sharedNotes = [...a.notes.top, ...a.notes.middle, ...a.notes.base].filter((n) => bNotes.has(n));
  const score =
    SIMILARITY_WEIGHTS.notes * notes +
    SIMILARITY_WEIGHTS.accords * accords +
    SIMILARITY_WEIGHTS.families * families +
    SIMILARITY_WEIGHTS.attributes * attributes;
  return { score, notes, accords, families, attributes, sharedNotes };
}

export const SIMILAR_MODES = ["similar", "affordable", "stronger", "lighter", "versatile"] as const;
export type SimilarMode = (typeof SIMILAR_MODES)[number];

export const SIMILAR_MODE_META: Record<SimilarMode, { label: string; description: string }> = {
  similar: { label: "Similar profile", description: "Closest overall scent profile" },
  affordable: { label: "More affordable", description: "Related profile for noticeably less" },
  stronger: { label: "Stronger", description: "Related profile with more power" },
  lighter: { label: "Lighter", description: "Related profile, softer and airier" },
  versatile: { label: "More versatile", description: "Related profile that suits more settings" },
};

export interface SimilarResult {
  fragrance: Fragrance;
  similarity: SimilarityBreakdown;
  /** Never "dupe" — we only describe profile closeness from listed data. */
  closeness: "Very close profile" | "Similar profile" | "Related direction";
  reason: string;
}

export function closenessLabel(score: number): SimilarResult["closeness"] {
  if (score >= 0.8) return "Very close profile";
  if (score >= 0.66) return "Similar profile";
  return "Related direction";
}

function performance(f: Fragrance) {
  return (f.projection + f.longevity) / 2;
}

/**
 * Find fragrances related to `target`. Alternative modes first constrain the
 * candidate pool (cheaper, stronger…) and then rank by similarity.
 */
export function findSimilar(
  target: Fragrance,
  catalog: Fragrance[],
  mode: SimilarMode = "similar",
  limit = 6,
  excludeIds: string[] = [],
): SimilarResult[] {
  const exclude = new Set([target.id, ...excludeIds]);
  const targetPrice = entryPrice(target);
  const minSimilarity = mode === "similar" ? 0 : 0.5;

  const candidates = catalog
    .filter((f) => !exclude.has(f.id))
    .filter((f) => {
      switch (mode) {
        case "affordable":
          return entryPrice(f) <= targetPrice * 0.8;
        case "stronger":
          return performance(f) >= performance(target) + 1;
        case "lighter":
          return f.projection <= target.projection - 1.5;
        case "versatile":
          return f.versatility >= Math.max(target.versatility + 1.5, 7);
        default:
          return true;
      }
    })
    .map((f) => ({ fragrance: f, similarity: fragranceSimilarity(target, f) }))
    .filter((c) => c.similarity.score >= minSimilarity);

  const rank = (c: (typeof candidates)[number]) => {
    if (mode === "affordable") {
      const savings = 1 - entryPrice(c.fragrance) / targetPrice;
      return c.similarity.score * 0.85 + savings * 0.15;
    }
    return c.similarity.score;
  };

  return candidates
    .sort((a, b) => rank(b) - rank(a))
    .slice(0, limit)
    .map((c) => ({
      ...c,
      closeness: closenessLabel(c.similarity.score),
      reason: similarReason(target, c.fragrance, c.similarity, mode),
    }));
}

function similarReason(
  target: Fragrance,
  f: Fragrance,
  sim: SimilarityBreakdown,
  mode: SimilarMode,
): string {
  const shared = sim.sharedNotes.slice(0, 3);
  const base = shared.length
    ? `Shares ${shared.length === 1 ? "a note" : "notes"} like ${shared
        .map((id) => noteName(id).toLowerCase())
        .join(", ")}`
    : `Similar ${f.accords[0]?.label.toLowerCase() ?? "overall"} character`;
  switch (mode) {
    case "affordable": {
      const saving = Math.round((1 - entryPrice(f) / entryPrice(target)) * 100);
      return `${base}, for about ${saving}% less`;
    }
    case "stronger":
      return `${base}, with more projection (${f.projection}/10) and longevity (${f.longevity}/10)`;
    case "lighter":
      return `${base}, in a softer register (${f.projection}/10 projection)`;
    case "versatile":
      return `${base}, and easier to wear anywhere (${f.versatility}/10 versatility)`;
    default:
      return base;
  }
}
