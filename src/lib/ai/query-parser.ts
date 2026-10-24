import type { FragranceFamily, Occasion, Season } from "@/types/fragrance";
import type { DislikedTrait } from "@/types/preferences";
import { FAMILY_SYNONYMS } from "@/lib/fragrance/families";
import { noteLookupTerms, noteName } from "@/lib/fragrance/notes";
import { FAMILY_META, OCCASION_META, formatPrice } from "@/lib/fragrance/taxonomy";
import { findReferenceProfile, type ReferenceProfile } from "./reference-profiles";

/**
 * Deterministic natural-language → structured-preference parser.
 * Powers the assistant when no LLM is configured, and is fully unit-testable.
 */

export type QueryIntent =
  | "recommend"
  | "similar"
  | "compare"
  | "today"
  | "collection"
  | "wishlist_add"
  | "wishlist_list"
  | "help";

export interface ParsedFilters {
  families?: FragranceFamily[];
  likedNotes?: string[];
  excludedNotes?: string[];
  dislikedNotes?: string[];
  dislikedTraits?: DislikedTrait[];
  occasions?: Occasion[];
  seasons?: Season[];
  strength?: number;
  longevityImportance?: number;
  maxPrice?: number;
  minPrice?: number;
  strictBudget?: boolean;
  novelty?: boolean;
}

export interface ParsedQuery {
  intent: QueryIntent;
  filters: ParsedFilters;
  /** Free text naming a fragrance ("Cobalt Code", "Bleu de Chanel"). */
  reference: string | null;
  referenceProfile: ReferenceProfile | null;
  compareTerms: string[];
  similarMode: "similar" | "affordable" | "stronger" | "lighter" | "versatile";
  /** Relative refinements of the previous turn. */
  refinements: { cheaper?: boolean; stronger?: boolean; lighter?: boolean; sweeter?: boolean; fresher?: boolean };
}

const SEASON_WORDS: Array<[RegExp, Season]> = [
  [/\bsummer|hot weather|heat|beach\b/, "summer"],
  [/\bwinter|cold weather|snow|freezing\b/, "winter"],
  [/\bspring\b/, "spring"],
  [/\bautumn|fall\b/, "autumn"],
];

const OCCASION_WORDS: Array<[RegExp, Occasion]> = [
  [/\b(work|office|meeting|interview|professional)\b/, "work"],
  [/\b(school|class|campus|university|college|lecture)\b/, "school"],
  [/\b(date|romantic|dinner date|date-night|date night)\b/, "date"],
  [/\b(casual|everyday|daily|weekend|errands)\b/, "casual"],
  [/\b(formal|wedding|gala|black tie|ceremony)\b/, "formal"],
  [/\b(gym|workout|sport|training|running)\b/, "gym"],
  [/\b(night out|club|clubbing|party|bar|concert|going out)\b/, "night_out"],
];

const NEGATORS = /(?:no|without|avoid|never|zero|not|hate|skip|exclude|excluding|minus)\s+(?:any\s+)?$/;
const SOFT_NEGATORS = /(?:not a fan of|don't like|dont like|dislike|less|not too much)\s+(?:the\s+)?$/;

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function parsePrice(text: string): Pick<ParsedFilters, "maxPrice" | "minPrice" | "strictBudget"> {
  const between = text.match(/between\s*\$?(\d{2,4})\s*(?:and|-|to)\s*\$?(\d{2,4})/);
  if (between) return { minPrice: Number(between[1]), maxPrice: Number(between[2]), strictBudget: true };
  const under = text.match(/(?:under|below|less than|max(?:imum)?|up to|no more than|<)\s*(?:of\s*)?(?:ca)?\$?\s*(\d{2,4})/);
  if (under) return { maxPrice: Number(under[1]), strictBudget: true };
  const around = text.match(/(?:around|about|roughly|~)\s*\$?(\d{2,4})/);
  if (around) return { maxPrice: Math.round(Number(around[1]) * 1.15), strictBudget: false };
  const over = text.match(/(?:over|above|more than|at least)\s*\$?(\d{2,4})/);
  if (over) return { minPrice: Number(over[1]) };
  if (/\b(cheap|affordable|budget|inexpensive|not too expensive|isn't too expensive|isnt too expensive|wallet[- ]friendly)\b/.test(text)) {
    return { maxPrice: 120, strictBudget: false };
  }
  if (/\b(luxury|splurge|high[- ]end|niche|expensive)\b/.test(text)) return { minPrice: 200 };
  return {};
}

export function parseQuery(input: string): ParsedQuery {
  const text = ` ${input.toLowerCase().replace(/[’`]/g, "'").replace(/\s+/g, " ")} `;
  const filters: ParsedFilters = {};

  // Intent
  let intent: QueryIntent = "recommend";
  let reference: string | null = null;
  let compareTerms: string[] = [];
  const compare = input.match(/compare\s+(.+?)\s+(?:and|with|to|vs\.?|versus)\s+(.+?)(?:\s+and\s+(.+?))?[?.!]*$/i)
    ?? input.match(/^(.+?)\s+(?:vs\.?|versus)\s+(.+?)[?.!]*$/i);
  if (compare) {
    intent = "compare";
    compareTerms = compare.slice(1).filter(Boolean).map((s) => s.trim());
  } else if (/\b(wear|put on)\b.*\btoday\b|\btoday\b.*\bwear\b|what should i wear/.test(text)) {
    intent = "today";
  } else if (/\b(add|save|put)\b.+\b(to|on|in)\s+(my\s+)?wish ?list\b/.test(text)) {
    intent = "wishlist_add";
    reference = input.replace(/.*?\b(?:add|save|put)\b\s+/i, "").replace(/\s+\b(?:to|on|in)\s+(?:my\s+)?wish ?list\b.*/i, "").trim();
  } else if (/\b(my|show)\b.*\bwish ?list\b/.test(text)) {
    intent = "wishlist_list";
  } else if (/\bmy (collection|shelf|fragrances|colognes)\b/.test(text)) {
    intent = "collection";
  } else {
    const similar = input.match(/(?:similar to|like|alternative(?:s)? to|dupe(?:s)? (?:of|for)|reminds me of|instead of|cheaper version of|something like)\s+(.+?)(?:[.?!,]|\s+(?:but|what|that|and|under|for|which)\b|$)/i);
    const likeStatement = input.match(/^i (?:like|love|enjoy|own|wear)\s+(.+?)(?:[.?!,]|\s+(?:but|what|and|so)\b|$)/i);
    const ref = similar?.[1] ?? likeStatement?.[1];
    if (ref && !/^(something|a |an |fresh|sweet|woody|spicy|strong|light)/i.test(ref.trim())) {
      intent = "similar";
      reference = ref.trim().replace(/^the\s+/i, "");
    }
  }
  if (/^(hi|hello|hey|help|what can you do)\b/.test(text.trim())) intent = "help";

  // Families
  const families: FragranceFamily[] = [];
  for (const [word, fams] of Object.entries(FAMILY_SYNONYMS)) {
    const re = new RegExp(`\\b${word}\\b`);
    const m = re.exec(text);
    if (m && !NEGATORS.test(text.slice(0, m.index)) && !/not too\s+$/.test(text.slice(0, m.index))) families.push(...fams);
  }
  if (families.length) filters.families = unique(families);

  // Notes (with hard/soft negation)
  const liked: string[] = [];
  const excluded: string[] = [];
  const disliked: string[] = [];
  let scrubbed = text;
  for (const [term, id] of noteLookupTerms()) {
    if (term.length < 3) continue;
    const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}s?\\b`, "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(scrubbed))) {
      const before = scrubbed.slice(Math.max(0, m.index - 30), m.index);
      if (SOFT_NEGATORS.test(before)) disliked.push(id);
      else if (NEGATORS.test(before) || /\b(?:no|without|avoid)\b[^.]*,\s*(?:or\s+|and\s+)?$/.test(before)) excluded.push(id);
      else liked.push(id);
    }
    scrubbed = scrubbed.replace(re, " ");
  }
  // A note named as a family ("vanilla", "leather") shouldn't also force the family when negated.
  if (excluded.length || disliked.length) {
    const negated = new Set([...excluded, ...disliked].map((id) => noteName(id).toLowerCase()));
    if (filters.families) {
      filters.families = filters.families.filter((f) => !negated.has(f) && !(f === "gourmand" && negated.has("vanilla")) && !(f === "leather" && negated.has("leather")));
      if (!filters.families.length) delete filters.families;
    }
  }
  if (liked.length) filters.likedNotes = unique(liked);
  if (excluded.length) filters.excludedNotes = unique(excluded);
  if (disliked.length) filters.dislikedNotes = unique(disliked);

  // Traits
  const traits: DislikedTrait[] = [];
  if (/not (too|overly|very) sweet|less sweet|not sweet|isn't sweet|no sweet/.test(text)) traits.push("overly_sweet");
  if (/not (too|overly) (musky|heavy musk)/.test(text)) traits.push("heavy_musk");
  if (/not (too|overly) (floral|flowery)/.test(text)) traits.push("very_floral");
  if (/not (too|overly) (smoky|smokey)/.test(text)) traits.push("smoky");
  if (/not (too|overly) powdery/.test(text)) traits.push("powdery");
  if (traits.length) filters.dislikedTraits = traits;

  // Strength / longevity
  if (/\b(beast ?mode|room[- ]filling|very strong|monster|loud)\b/.test(text)) filters.strength = 5;
  else if (/\b(strong|powerful|projects?|projection|bold|noticeable)\b/.test(text) && !/not (too )?strong/.test(text)) filters.strength = 4;
  else if (/\b(skin scent|very light|barely there|intimate)\b/.test(text)) filters.strength = 1;
  else if (/\b(subtle|light|soft|office[- ]safe|not too strong|inoffensive|close to the skin)\b/.test(text)) filters.strength = 2;
  if (/\b(long[- ]lasting|lasts? all day|longevity|lasts? long|performance)\b/.test(text)) filters.longevityImportance = 5;

  // Seasons & occasions
  const seasons = SEASON_WORDS.filter(([re]) => re.test(text)).map(([, s]) => s);
  if (seasons.length) filters.seasons = unique(seasons);
  const occasions = OCCASION_WORDS.filter(([re]) => re.test(text)).map(([, o]) => o);
  if (occasions.length) filters.occasions = unique(occasions);

  Object.assign(filters, parsePrice(text));
  if (/\b(different|outside my comfort|something new|surprise me|branch out|adventurous|unusual|change it up)\b/.test(text)) {
    filters.novelty = true;
  }

  const refinements: ParsedQuery["refinements"] = {};
  if (/\b(cheaper|less expensive|lower price|more affordable)\b/.test(text)) refinements.cheaper = true;
  if (/\b(stronger|more projection|louder|longer lasting)\b/.test(text)) refinements.stronger = true;
  if (/\b(lighter|softer|more subtle|weaker)\b/.test(text)) refinements.lighter = true;
  if (/\bsweeter\b/.test(text)) refinements.sweeter = true;
  if (/\bfresher\b/.test(text)) refinements.fresher = true;

  let similarMode: ParsedQuery["similarMode"] = "similar";
  if (intent === "similar") {
    if (refinements.cheaper || filters.maxPrice) similarMode = "affordable";
    else if (refinements.stronger) similarMode = "stronger";
    else if (refinements.lighter) similarMode = "lighter";
  }

  return {
    intent,
    filters,
    reference,
    referenceProfile: reference ? findReferenceProfile(reference) : null,
    compareTerms,
    similarMode,
    refinements,
  };
}

/** Human-readable chips describing what the assistant understood. */
export function describeFilters(f: ParsedFilters): string[] {
  const out: string[] = [];
  if (f.families?.length) out.push(f.families.map((x) => FAMILY_META[x].label).join(" / "));
  if (f.likedNotes?.length) out.push(`Notes: ${f.likedNotes.map(noteName).join(", ")}`);
  if (f.excludedNotes?.length) out.push(`No ${f.excludedNotes.map(noteName).join(", ")}`);
  if (f.dislikedNotes?.length) out.push(`Less ${f.dislikedNotes.map(noteName).join(", ")}`);
  if (f.dislikedTraits?.includes("overly_sweet")) out.push("Not too sweet");
  if (f.occasions?.length) out.push(f.occasions.map((o) => OCCASION_META[o].label).join(" / "));
  if (f.seasons?.length) out.push(f.seasons.map((s) => s[0].toUpperCase() + s.slice(1)).join(" / "));
  if (f.strength) out.push(f.strength >= 4 ? "Strong" : f.strength <= 2 ? "Light" : "Moderate");
  if (f.longevityImportance && f.longevityImportance >= 4) out.push("Long-lasting");
  if (f.maxPrice) out.push(`${f.strictBudget ? "Under" : "Around"} ${formatPrice(f.maxPrice)}`);
  if (f.minPrice) out.push(`From ${formatPrice(f.minPrice)}`);
  if (f.novelty) out.push("Something different");
  return out;
}
