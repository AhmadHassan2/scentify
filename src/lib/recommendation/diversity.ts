import type { Fragrance } from "@/types/fragrance";
import { DIVERSITY } from "./config";
import { fragranceSimilarity } from "./similarity";

/**
 * Maximal Marginal Relevance re-ranking: repeatedly pick the item with the
 * best trade-off between relevance and dissimilarity to what's already picked.
 * Prevents a results page of five near-identical blue fragrances.
 */
export function mmr<T>(
  items: T[],
  relevance: (item: T) => number,
  fragranceOf: (item: T) => Fragrance,
  k: number,
  lambda = DIVERSITY.lambda,
): T[] {
  const pool = [...items];
  const picked: T[] = [];
  const simCache = new Map<string, number>();
  const sim = (a: Fragrance, b: Fragrance) => {
    const key = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
    let v = simCache.get(key);
    if (v === undefined) {
      v = fragranceSimilarity(a, b).score;
      simCache.set(key, v);
    }
    return v;
  };

  while (picked.length < k && pool.length) {
    let bestIndex = 0;
    let bestValue = -Infinity;
    pool.forEach((item, i) => {
      const f = fragranceOf(item);
      const maxSim = picked.length
        ? Math.max(...picked.map((p) => sim(f, fragranceOf(p))))
        : 0;
      const value = lambda * relevance(item) - (1 - lambda) * maxSim;
      if (value > bestValue) {
        bestValue = value;
        bestIndex = i;
      }
    });
    picked.push(pool.splice(bestIndex, 1)[0]);
  }
  return picked;
}
