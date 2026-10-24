import type { AttributeKey, FragranceFamily } from "@/types/fragrance";

/**
 * Olfactive note taxonomy.
 *
 * Every note belongs to one primary group (and optionally a secondary group).
 * Groups drive note similarity, accords and family derivation. Each note also
 * carries a perceptual profile used to compute fragrance attributes, a warmth
 * value (-1 = cooling/fresh, +1 = warm/heavy) and an intensity (0–1).
 */

export const NOTE_GROUPS = [
  "citrus",
  "aquatic",
  "green",
  "aromatic",
  "floral",
  "white_floral",
  "fruity",
  "fresh_spice",
  "warm_spice",
  "woody",
  "earthy",
  "amber",
  "gourmand",
  "boozy",
  "leather",
  "tobacco",
  "musk",
  "smoky",
  "powdery",
] as const;
export type NoteGroup = (typeof NOTE_GROUPS)[number];

export const NOTE_GROUP_LABELS: Record<NoteGroup, string> = {
  citrus: "Citrus",
  aquatic: "Aquatic",
  green: "Green",
  aromatic: "Aromatic",
  floral: "Floral",
  white_floral: "White Floral",
  fruity: "Fruity",
  fresh_spice: "Fresh Spicy",
  warm_spice: "Warm Spicy",
  woody: "Woody",
  earthy: "Earthy",
  amber: "Amber",
  gourmand: "Sweet",
  boozy: "Boozy",
  leather: "Leather",
  tobacco: "Tobacco",
  musk: "Musky",
  smoky: "Smoky",
  powdery: "Powdery",
};

/** Which user-facing family a note group contributes to. */
export const NOTE_GROUP_FAMILY: Record<NoteGroup, FragranceFamily> = {
  citrus: "citrus",
  aquatic: "aquatic",
  green: "green",
  aromatic: "aromatic",
  floral: "floral",
  white_floral: "floral",
  fruity: "fruity",
  fresh_spice: "spicy",
  warm_spice: "spicy",
  woody: "woody",
  earthy: "woody",
  amber: "amber",
  gourmand: "gourmand",
  boozy: "gourmand",
  leather: "leather",
  tobacco: "smoky",
  musk: "musky",
  smoky: "smoky",
  powdery: "floral",
};

export interface NoteDefinition {
  id: string;
  name: string;
  groups: [NoteGroup] | [NoteGroup, NoteGroup];
  /** -1 (cooling, fresh) … +1 (warm, dense) */
  warmth: number;
  /** 0 (delicate) … 1 (very potent) */
  intensity: number;
  profile: Partial<Record<AttributeKey, number>>;
  aliases?: string[];
}

function n(
  id: string,
  name: string,
  groups: NoteDefinition["groups"],
  warmth: number,
  intensity: number,
  profile: NoteDefinition["profile"],
  aliases?: string[],
): NoteDefinition {
  return { id, name, groups, warmth, intensity, profile, aliases };
}

export const NOTES: NoteDefinition[] = [
  // Citrus
  n("bergamot", "Bergamot", ["citrus"], -0.7, 0.4, { freshness: 9, fruitiness: 3 }),
  n("lemon", "Lemon", ["citrus"], -0.9, 0.45, { freshness: 10, fruitiness: 3 }),
  n("lime", "Lime", ["citrus"], -0.9, 0.45, { freshness: 10, greenness: 2 }),
  n("grapefruit", "Grapefruit", ["citrus", "fruity"], -0.8, 0.5, { freshness: 9, fruitiness: 4 }),
  n("mandarin", "Mandarin", ["citrus", "fruity"], -0.5, 0.4, { freshness: 8, sweetness: 3, fruitiness: 4 }, ["tangerine"]),
  n("orange", "Sweet Orange", ["citrus", "fruity"], -0.4, 0.4, { freshness: 7, sweetness: 4, fruitiness: 5 }),
  n("blood_orange", "Blood Orange", ["citrus", "fruity"], -0.4, 0.45, { freshness: 7, sweetness: 3, fruitiness: 6 }),
  n("yuzu", "Yuzu", ["citrus"], -0.8, 0.45, { freshness: 9, greenness: 2 }),
  n("citron", "Citron", ["citrus"], -0.8, 0.4, { freshness: 9 }),
  n("petitgrain", "Petitgrain", ["citrus", "green"], -0.6, 0.4, { freshness: 8, greenness: 4, woodiness: 1 }),
  n("neroli", "Neroli", ["white_floral", "citrus"], -0.5, 0.45, { freshness: 7, floralness: 6 }),

  // Aquatic
  n("sea_notes", "Sea Notes", ["aquatic"], -0.9, 0.55, { freshness: 10 }, ["marine", "ocean"]),
  n("sea_salt", "Sea Salt", ["aquatic", "musk"], -0.6, 0.4, { freshness: 8, muskiness: 2 }, ["salt"]),
  n("calone", "Calone", ["aquatic", "fruity"], -0.9, 0.7, { freshness: 10, fruitiness: 2 }),
  n("rain_accord", "Rain Accord", ["aquatic", "green"], -0.8, 0.35, { freshness: 9, greenness: 3 }, ["rain", "petrichor"]),
  n("seaweed", "Seaweed", ["aquatic", "green"], -0.6, 0.5, { freshness: 7, greenness: 4 }, ["algae"]),
  n("ozonic", "Ozonic Accord", ["aquatic"], -1, 0.4, { freshness: 10 }, ["ozone"]),

  // Green
  n("violet_leaf", "Violet Leaf", ["green"], -0.6, 0.55, { greenness: 9, freshness: 6 }),
  n("galbanum", "Galbanum", ["green", "earthy"], -0.4, 0.75, { greenness: 10, freshness: 5 }),
  n("green_tea", "Green Tea", ["green"], -0.6, 0.3, { greenness: 7, freshness: 7 }, ["tea"]),
  n("fig_leaf", "Fig Leaf", ["green", "fruity"], -0.3, 0.5, { greenness: 8, creaminess: 3, fruitiness: 3 }),
  n("bamboo", "Bamboo", ["green"], -0.7, 0.3, { greenness: 7, freshness: 7 }),
  n("mate", "Maté", ["green", "aromatic"], -0.3, 0.4, { greenness: 6, woodiness: 2 }),
  n("tomato_leaf", "Tomato Leaf", ["green"], -0.5, 0.6, { greenness: 10, freshness: 5 }),

  // Aromatic
  n("lavender", "Lavender", ["aromatic", "floral"], -0.3, 0.55, { freshness: 6, floralness: 3, powderiness: 2 }),
  n("rosemary", "Rosemary", ["aromatic", "green"], -0.6, 0.5, { freshness: 7, greenness: 5 }),
  n("sage", "Sage", ["aromatic"], -0.4, 0.5, { freshness: 6, greenness: 4 }),
  n("clary_sage", "Clary Sage", ["aromatic", "musk"], -0.2, 0.5, { freshness: 4, muskiness: 3, greenness: 3 }),
  n("mint", "Mint", ["aromatic", "green"], -1, 0.6, { freshness: 10, greenness: 4 }, ["peppermint", "spearmint"]),
  n("basil", "Basil", ["aromatic", "green"], -0.5, 0.5, { freshness: 6, greenness: 6, spiciness: 1 }),
  n("juniper", "Juniper Berry", ["aromatic", "woody"], -0.5, 0.45, { freshness: 7, woodiness: 3 }, ["juniper"]),
  n("artemisia", "Artemisia", ["aromatic", "green"], -0.3, 0.55, { greenness: 6, freshness: 4 }),
  n("thyme", "Thyme", ["aromatic", "fresh_spice"], -0.2, 0.5, { greenness: 4, spiciness: 3 }),
  n("geranium", "Geranium", ["floral", "aromatic"], -0.3, 0.5, { floralness: 5, freshness: 5, greenness: 2 }),

  // Floral
  n("rose", "Rose", ["floral"], 0, 0.6, { floralness: 10, fruitiness: 1 }),
  n("iris", "Iris", ["powdery", "floral"], 0.1, 0.5, { powderiness: 8, floralness: 5, creaminess: 2 }, ["orris"]),
  n("violet", "Violet", ["powdery", "floral"], -0.1, 0.4, { powderiness: 6, floralness: 6, sweetness: 2 }),
  n("magnolia", "Magnolia", ["floral"], -0.2, 0.4, { floralness: 8, freshness: 3 }),
  n("lotus", "Lotus", ["floral", "aquatic"], -0.5, 0.3, { floralness: 6, freshness: 6 }),
  n("jasmine", "Jasmine", ["white_floral"], 0.2, 0.7, { floralness: 10, sweetness: 3, muskiness: 2 }),
  n("orange_blossom", "Orange Blossom", ["white_floral"], 0, 0.55, { floralness: 8, sweetness: 3, freshness: 3 }),
  n("tuberose", "Tuberose", ["white_floral"], 0.4, 0.85, { floralness: 10, creaminess: 4, sweetness: 3 }),
  n("ylang_ylang", "Ylang-Ylang", ["white_floral"], 0.3, 0.65, { floralness: 9, creaminess: 3, sweetness: 3 }),
  n("heliotrope", "Heliotrope", ["powdery", "gourmand"], 0.4, 0.5, { powderiness: 7, sweetness: 5, creaminess: 3 }),

  // Fruity
  n("apple", "Green Apple", ["fruity"], -0.5, 0.45, { fruitiness: 8, freshness: 5, sweetness: 2 }),
  n("pineapple", "Pineapple", ["fruity"], -0.4, 0.6, { fruitiness: 9, sweetness: 3, freshness: 6 }),
  n("pear", "Pear", ["fruity"], -0.3, 0.4, { fruitiness: 8, sweetness: 3, freshness: 4 }),
  n("blackcurrant", "Blackcurrant", ["fruity", "green"], -0.2, 0.55, { fruitiness: 8, greenness: 3, sweetness: 2 }, ["cassis"]),
  n("fig", "Fig", ["fruity", "gourmand"], 0.1, 0.5, { fruitiness: 6, creaminess: 4, sweetness: 3 }),
  n("plum", "Plum", ["fruity", "gourmand"], 0.5, 0.55, { fruitiness: 7, sweetness: 5, warmth: 3 }),
  n("peach", "Peach", ["fruity"], 0, 0.45, { fruitiness: 8, sweetness: 4, creaminess: 2 }),
  n("raspberry", "Raspberry", ["fruity"], 0, 0.5, { fruitiness: 8, sweetness: 5 }),
  n("cherry", "Black Cherry", ["fruity", "gourmand"], 0.4, 0.6, { fruitiness: 7, sweetness: 7 }),
  n("melon", "Melon", ["fruity", "aquatic"], -0.6, 0.4, { fruitiness: 7, freshness: 6, sweetness: 2 }),

  // Fresh spices
  n("pink_pepper", "Pink Pepper", ["fresh_spice"], -0.1, 0.5, { spiciness: 6, freshness: 4, fruitiness: 1 }),
  n("black_pepper", "Black Pepper", ["fresh_spice"], 0.1, 0.55, { spiciness: 7, woodiness: 1 }, ["pepper"]),
  n("cardamom", "Cardamom", ["fresh_spice", "aromatic"], 0.1, 0.55, { spiciness: 6, freshness: 4, creaminess: 1 }),
  n("ginger", "Ginger", ["fresh_spice"], -0.3, 0.55, { spiciness: 6, freshness: 6 }),
  n("coriander", "Coriander", ["fresh_spice", "aromatic"], -0.1, 0.45, { spiciness: 4, freshness: 4 }),
  n("elemi", "Elemi", ["fresh_spice", "amber"], 0, 0.45, { spiciness: 3, freshness: 5, woodiness: 2 }),

  // Warm spices
  n("cinnamon", "Cinnamon", ["warm_spice", "gourmand"], 0.8, 0.7, { spiciness: 8, sweetness: 4, warmth: 7 }),
  n("clove", "Clove", ["warm_spice"], 0.7, 0.75, { spiciness: 9, warmth: 6 }),
  n("nutmeg", "Nutmeg", ["warm_spice"], 0.5, 0.5, { spiciness: 6, warmth: 5, woodiness: 1 }),
  n("saffron", "Saffron", ["warm_spice", "leather"], 0.6, 0.65, { spiciness: 5, warmth: 6, smokiness: 1 }),
  n("cumin", "Cumin", ["warm_spice", "musk"], 0.6, 0.8, { spiciness: 7, muskiness: 4, warmth: 5 }),
  n("star_anise", "Star Anise", ["warm_spice", "gourmand"], 0.3, 0.6, { spiciness: 5, sweetness: 4 }, ["anise"]),

  // Woods
  n("cedar", "Cedarwood", ["woody"], 0.1, 0.5, { woodiness: 9 }, ["cedarwood", "atlas cedar"]),
  n("sandalwood", "Sandalwood", ["woody"], 0.4, 0.5, { woodiness: 8, creaminess: 7, warmth: 3 }),
  n("vetiver", "Vetiver", ["woody", "earthy"], 0, 0.6, { woodiness: 8, greenness: 3, smokiness: 2 }),
  n("guaiac_wood", "Guaiac Wood", ["woody", "smoky"], 0.4, 0.55, { woodiness: 8, smokiness: 4, warmth: 3 }, ["guaiac"]),
  n("cypress", "Cypress", ["woody", "aromatic"], -0.3, 0.45, { woodiness: 7, freshness: 4, greenness: 3 }),
  n("pine", "Pine Needles", ["woody", "green"], -0.4, 0.5, { woodiness: 6, freshness: 5, greenness: 5 }, ["fir", "fir balsam"]),
  n("papyrus", "Papyrus", ["woody", "green"], 0, 0.4, { woodiness: 6, greenness: 3, smokiness: 1 }),
  n("cashmere_wood", "Cashmere Wood", ["woody", "musk"], 0.3, 0.5, { woodiness: 6, muskiness: 4, creaminess: 3 }, ["cashmeran"]),
  n("driftwood", "Driftwood", ["woody", "aquatic"], -0.3, 0.4, { woodiness: 6, freshness: 5 }),
  n("ambroxan", "Ambroxan", ["woody", "musk"], 0.1, 0.75, { woodiness: 5, muskiness: 5, freshness: 3 }, ["ambrox", "ambergris accord"]),
  n("iso_e", "Iso E Super", ["woody", "musk"], 0.1, 0.45, { woodiness: 6, muskiness: 3 }),
  n("oud", "Oud", ["woody", "smoky"], 0.8, 0.95, { woodiness: 9, smokiness: 5, warmth: 6, muskiness: 3 }, ["agarwood", "oudh"]),
  n("oak", "Oak Barrel", ["woody", "boozy"], 0.5, 0.5, { woodiness: 7, warmth: 4, smokiness: 1 }),

  // Earthy
  n("patchouli", "Patchouli", ["earthy", "woody"], 0.5, 0.7, { woodiness: 7, warmth: 4, sweetness: 1 }),
  n("oakmoss", "Oakmoss", ["earthy", "green"], 0.1, 0.6, { greenness: 5, woodiness: 4 }, ["moss"]),

  // Amber & resins
  n("amber", "Amber", ["amber"], 0.9, 0.7, { warmth: 9, sweetness: 5, creaminess: 2 }),
  n("labdanum", "Labdanum", ["amber", "leather"], 0.8, 0.75, { warmth: 8, sweetness: 3, smokiness: 2 }),
  n("benzoin", "Benzoin", ["amber", "gourmand"], 0.8, 0.6, { warmth: 8, sweetness: 6, creaminess: 3 }),
  n("frankincense", "Frankincense", ["smoky", "amber"], 0.3, 0.65, { smokiness: 7, freshness: 2, woodiness: 2 }, ["incense", "olibanum"]),
  n("myrrh", "Myrrh", ["amber", "smoky"], 0.6, 0.6, { warmth: 6, smokiness: 3 }),
  n("styrax", "Styrax", ["amber", "leather"], 0.7, 0.6, { warmth: 6, smokiness: 3, sweetness: 2 }),

  // Gourmand
  n("vanilla", "Vanilla", ["gourmand"], 0.8, 0.65, { sweetness: 9, creaminess: 6, warmth: 6 }),
  n("tonka_bean", "Tonka Bean", ["gourmand", "amber"], 0.7, 0.6, { sweetness: 7, warmth: 6, creaminess: 3, powderiness: 1 }, ["tonka", "coumarin"]),
  n("caramel", "Caramel", ["gourmand"], 0.8, 0.7, { sweetness: 10, warmth: 6 }),
  n("cacao", "Cacao", ["gourmand"], 0.7, 0.6, { sweetness: 6, warmth: 6, creaminess: 3 }, ["chocolate", "cocoa"]),
  n("coffee", "Coffee", ["gourmand", "smoky"], 0.6, 0.65, { sweetness: 3, warmth: 6, smokiness: 2 }),
  n("honey", "Honey", ["gourmand", "musk"], 0.7, 0.7, { sweetness: 8, warmth: 6, muskiness: 2 }),
  n("praline", "Praline", ["gourmand"], 0.8, 0.7, { sweetness: 10, creaminess: 4, warmth: 5 }),
  n("almond", "Almond", ["gourmand", "powdery"], 0.5, 0.55, { sweetness: 6, creaminess: 5, powderiness: 2 }),
  n("coconut", "Coconut", ["gourmand", "fruity"], 0.3, 0.5, { sweetness: 6, creaminess: 7, fruitiness: 2 }),
  n("lavender_absolute", "Lavender Absolute", ["aromatic", "gourmand"], 0.2, 0.6, { floralness: 3, sweetness: 3, freshness: 3, powderiness: 2 }),

  // Boozy
  n("rum", "Rum", ["boozy", "gourmand"], 0.7, 0.6, { sweetness: 6, warmth: 7 }),
  n("cognac", "Cognac", ["boozy", "fruity"], 0.6, 0.6, { warmth: 6, fruitiness: 3, sweetness: 4 }),
  n("whiskey", "Whiskey", ["boozy", "smoky"], 0.6, 0.6, { warmth: 6, smokiness: 3, woodiness: 3 }, ["whisky"]),

  // Leather & tobacco
  n("leather", "Leather", ["leather"], 0.6, 0.8, { smokiness: 4, warmth: 5, muskiness: 2 }),
  n("suede", "Suede", ["leather", "powdery"], 0.4, 0.5, { powderiness: 3, muskiness: 3, warmth: 3, creaminess: 2 }),
  n("birch_tar", "Birch Tar", ["leather", "smoky"], 0.6, 0.9, { smokiness: 9, woodiness: 3 }, ["birch"]),
  n("tobacco", "Tobacco Leaf", ["tobacco"], 0.7, 0.75, { warmth: 7, sweetness: 3, smokiness: 3 }, ["tobacco"]),
  n("hay", "Hay", ["tobacco", "green"], 0.3, 0.4, { warmth: 3, greenness: 3, sweetness: 2 }),

  // Musks
  n("white_musk", "White Musk", ["musk"], 0, 0.4, { muskiness: 8, freshness: 3, powderiness: 2 }, ["clean musk"]),
  n("musk", "Musk", ["musk"], 0.3, 0.55, { muskiness: 9, warmth: 2 }),
  n("ambrette", "Ambrette", ["musk", "fruity"], 0.1, 0.4, { muskiness: 7, fruitiness: 2, powderiness: 2 }),

  // Smoke
  n("cade", "Cade", ["smoky", "leather"], 0.6, 0.85, { smokiness: 9, woodiness: 3 }),
  n("smoked_tea", "Smoked Tea", ["smoky", "green"], 0.3, 0.6, { smokiness: 7, greenness: 3 }, ["lapsang souchong"]),
];

export const NOTE_BY_ID: Record<string, NoteDefinition> = Object.fromEntries(
  NOTES.map((note) => [note.id, note]),
);

const NOTE_ALIAS_INDEX: Record<string, string> = (() => {
  const index: Record<string, string> = {};
  for (const note of NOTES) {
    index[note.id] = note.id;
    index[note.id.replace(/_/g, " ")] = note.id;
    index[note.name.toLowerCase()] = note.id;
    for (const alias of note.aliases ?? []) index[alias.toLowerCase()] = note.id;
  }
  return index;
})();

/** Resolve free text ("Cedarwood", "oudh", "tonka") to a canonical note id. */
export function resolveNoteId(input: string): string | null {
  const key = input.trim().toLowerCase();
  return NOTE_ALIAS_INDEX[key] ?? NOTE_ALIAS_INDEX[key.replace(/s$/, "")] ?? null;
}

/** All lookup terms (lowercase) that map to note ids, longest first. */
export function noteLookupTerms(): Array<[string, string]> {
  return Object.entries(NOTE_ALIAS_INDEX).sort((a, b) => b[0].length - a[0].length);
}

export function noteName(id: string): string {
  return NOTE_BY_ID[id]?.name ?? id.replace(/_/g, " ");
}

/**
 * Affinity between note groups (symmetric, 0–1). Used for fuzzy note matching:
 * a user who loves bergamot will partially match grapefruit-led fragrances.
 */
const GROUP_AFFINITY_PAIRS: Array<[NoteGroup, NoteGroup, number]> = [
  ["citrus", "aquatic", 0.4],
  ["citrus", "green", 0.4],
  ["citrus", "aromatic", 0.4],
  ["citrus", "fruity", 0.4],
  ["citrus", "fresh_spice", 0.3],
  ["aquatic", "green", 0.35],
  ["aquatic", "aromatic", 0.35],
  ["aquatic", "musk", 0.3],
  ["green", "aromatic", 0.45],
  ["green", "earthy", 0.35],
  ["green", "floral", 0.25],
  ["aromatic", "woody", 0.3],
  ["aromatic", "fresh_spice", 0.35],
  ["floral", "white_floral", 0.6],
  ["floral", "powdery", 0.5],
  ["floral", "fruity", 0.3],
  ["floral", "musk", 0.3],
  ["white_floral", "powdery", 0.3],
  ["white_floral", "gourmand", 0.2],
  ["fruity", "gourmand", 0.35],
  ["fresh_spice", "warm_spice", 0.5],
  ["fresh_spice", "woody", 0.25],
  ["warm_spice", "amber", 0.45],
  ["warm_spice", "gourmand", 0.35],
  ["warm_spice", "woody", 0.3],
  ["woody", "earthy", 0.55],
  ["woody", "smoky", 0.35],
  ["woody", "amber", 0.3],
  ["woody", "musk", 0.3],
  ["woody", "leather", 0.3],
  ["earthy", "smoky", 0.3],
  ["amber", "gourmand", 0.5],
  ["amber", "leather", 0.35],
  ["amber", "smoky", 0.4],
  ["amber", "tobacco", 0.4],
  ["amber", "boozy", 0.35],
  ["gourmand", "boozy", 0.5],
  ["gourmand", "tobacco", 0.35],
  ["gourmand", "powdery", 0.3],
  ["boozy", "tobacco", 0.4],
  ["leather", "smoky", 0.55],
  ["leather", "tobacco", 0.4],
  ["leather", "musk", 0.25],
  ["tobacco", "smoky", 0.4],
  ["musk", "powdery", 0.4],
];

const GROUP_AFFINITY = new Map<string, number>();
for (const [a, b, value] of GROUP_AFFINITY_PAIRS) {
  GROUP_AFFINITY.set(`${a}|${b}`, value);
  GROUP_AFFINITY.set(`${b}|${a}`, value);
}

export function groupAffinity(a: NoteGroup, b: NoteGroup): number {
  if (a === b) return 1;
  return GROUP_AFFINITY.get(`${a}|${b}`) ?? 0;
}

/**
 * Similarity between two notes, 0–1.
 * Identical = 1, same primary group ≈ 0.6, related groups scale down from there.
 */
export function noteSimilarity(aId: string, bId: string): number {
  if (aId === bId) return 1;
  const a = NOTE_BY_ID[aId];
  const b = NOTE_BY_ID[bId];
  if (!a || !b) return 0;
  let best = 0;
  a.groups.forEach((ga, ia) => {
    b.groups.forEach((gb, ib) => {
      const rank = ia === 0 && ib === 0 ? 1 : ia === 0 || ib === 0 ? 0.8 : 0.65;
      best = Math.max(best, groupAffinity(ga, gb) * 0.6 * rank);
    });
  });
  return best;
}
