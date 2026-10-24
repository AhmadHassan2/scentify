import type { FragranceFamily } from "@/types/fragrance";

/**
 * How closely related two fragrance families are (symmetric, 0–1).
 * Lets "woody" lovers partially match amber-woody or leather fragrances
 * instead of treating every non-identical family as a total miss.
 */
const PAIRS: Array<[FragranceFamily, FragranceFamily, number]> = [
  ["citrus", "aquatic", 0.6],
  ["citrus", "aromatic", 0.55],
  ["citrus", "green", 0.6],
  ["citrus", "fruity", 0.5],
  ["citrus", "floral", 0.35],
  ["citrus", "spicy", 0.3],
  ["citrus", "woody", 0.3],
  ["citrus", "musky", 0.35],
  ["aquatic", "aromatic", 0.5],
  ["aquatic", "green", 0.45],
  ["aquatic", "musky", 0.45],
  ["aquatic", "woody", 0.35],
  ["aquatic", "fruity", 0.35],
  ["aromatic", "woody", 0.5],
  ["aromatic", "green", 0.55],
  ["aromatic", "spicy", 0.4],
  ["aromatic", "floral", 0.35],
  ["aromatic", "leather", 0.25],
  ["green", "floral", 0.45],
  ["green", "woody", 0.4],
  ["floral", "fruity", 0.55],
  ["floral", "musky", 0.5],
  ["floral", "gourmand", 0.35],
  ["floral", "amber", 0.35],
  ["floral", "woody", 0.35],
  ["fruity", "gourmand", 0.5],
  ["fruity", "musky", 0.3],
  ["woody", "amber", 0.55],
  ["woody", "spicy", 0.5],
  ["woody", "leather", 0.5],
  ["woody", "smoky", 0.55],
  ["woody", "musky", 0.4],
  ["woody", "gourmand", 0.3],
  ["spicy", "amber", 0.65],
  ["spicy", "gourmand", 0.45],
  ["spicy", "leather", 0.45],
  ["spicy", "smoky", 0.4],
  ["amber", "gourmand", 0.65],
  ["amber", "leather", 0.45],
  ["amber", "smoky", 0.5],
  ["amber", "musky", 0.45],
  ["gourmand", "musky", 0.35],
  ["gourmand", "leather", 0.25],
  ["gourmand", "smoky", 0.3],
  ["leather", "smoky", 0.6],
];

const AFFINITY = new Map<string, number>();
for (const [a, b, v] of PAIRS) {
  AFFINITY.set(`${a}|${b}`, v);
  AFFINITY.set(`${b}|${a}`, v);
}

export const DEFAULT_FAMILY_AFFINITY = 0.1;

export function familyAffinity(a: FragranceFamily, b: FragranceFamily): number {
  if (a === b) return 1;
  return AFFINITY.get(`${a}|${b}`) ?? DEFAULT_FAMILY_AFFINITY;
}

/** Natural-language groupings used by the quiz and query parser. */
export const FAMILY_SYNONYMS: Record<string, FragranceFamily[]> = {
  fresh: ["citrus", "aquatic", "aromatic", "green"],
  clean: ["aquatic", "musky", "citrus"],
  blue: ["aquatic", "aromatic"],
  marine: ["aquatic"],
  aquatic: ["aquatic"],
  citrus: ["citrus"],
  citrusy: ["citrus"],
  sweet: ["gourmand", "amber"],
  gourmand: ["gourmand"],
  vanilla: ["gourmand"],
  woody: ["woody"],
  earthy: ["woody", "green"],
  spicy: ["spicy"],
  warm: ["amber", "spicy", "gourmand"],
  amber: ["amber"],
  oriental: ["amber", "spicy"],
  leather: ["leather"],
  leathery: ["leather"],
  smoky: ["smoky"],
  incense: ["smoky"],
  tobacco: ["smoky", "amber"],
  floral: ["floral"],
  flowery: ["floral"],
  fruity: ["fruity"],
  green: ["green"],
  aromatic: ["aromatic"],
  herbal: ["aromatic"],
  musky: ["musky"],
  powdery: ["floral", "musky"],
};
