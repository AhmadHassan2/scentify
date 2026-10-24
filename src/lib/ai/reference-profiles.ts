import type { FragranceFamily } from "@/types/fragrance";

/**
 * Approximate, publicly listed note profiles of a few widely known real-world
 * fragrances. Used ONLY to translate "I like X" into structured preferences
 * for searching our own catalog. These products are not in the demo catalog,
 * and we never present them as records, prices or availability.
 */
export interface ReferenceProfile {
  name: string;
  families: FragranceFamily[];
  notes: string[];
}

export const REFERENCE_PROFILES: Record<string, ReferenceProfile> = {
  "bleu de chanel": { name: "Bleu de Chanel", families: ["aromatic", "woody", "citrus"], notes: ["grapefruit", "lemon", "mint", "pink_pepper", "ginger", "nutmeg", "frankincense", "vetiver", "cedar", "sandalwood"] },
  sauvage: { name: "Dior Sauvage", families: ["aromatic", "spicy", "woody"], notes: ["bergamot", "black_pepper", "lavender", "geranium", "ambroxan", "vetiver", "patchouli"] },
  "acqua di gio": { name: "Acqua di Giò", families: ["aquatic", "citrus", "aromatic"], notes: ["lime", "lemon", "bergamot", "sea_notes", "jasmine", "rosemary", "white_musk", "cedar", "patchouli"] },
  aventus: { name: "Creed Aventus", families: ["fruity", "woody", "smoky"], notes: ["pineapple", "bergamot", "blackcurrant", "apple", "birch_tar", "patchouli", "jasmine", "musk", "oakmoss", "ambroxan"] },
  "la nuit de l'homme": { name: "La Nuit de L'Homme", families: ["spicy", "aromatic", "woody"], notes: ["cardamom", "bergamot", "lavender", "cedar", "vetiver"] },
  "tobacco vanille": { name: "Tobacco Vanille", families: ["smoky", "gourmand", "amber"], notes: ["tobacco", "vanilla", "tonka_bean", "cacao", "cinnamon", "plum"] },
  "oud wood": { name: "Oud Wood", families: ["woody", "smoky"], notes: ["oud", "sandalwood", "vetiver", "cardamom", "pink_pepper", "tonka_bean", "amber"] },
  spicebomb: { name: "Spicebomb", families: ["spicy", "amber"], notes: ["pink_pepper", "bergamot", "cinnamon", "saffron", "tobacco", "leather", "vetiver"] },
  "le male": { name: "Le Male", families: ["aromatic", "gourmand"], notes: ["mint", "lavender", "cardamom", "cinnamon", "vanilla", "tonka_bean", "sandalwood"] },
  "terre d'hermes": { name: "Terre d'Hermès", families: ["woody", "citrus"], notes: ["orange", "grapefruit", "black_pepper", "vetiver", "cedar", "patchouli", "benzoin"] },
  eros: { name: "Versace Eros", families: ["aromatic", "gourmand"], notes: ["mint", "apple", "lemon", "tonka_bean", "geranium", "vanilla", "vetiver", "cedar"] },
  "y edp": { name: "YSL Y", families: ["aromatic", "fruity"], notes: ["apple", "ginger", "bergamot", "sage", "juniper", "geranium", "ambroxan", "tonka_bean", "cedar", "vetiver"] },
  "baccarat rouge": { name: "Baccarat Rouge 540", families: ["amber", "woody", "floral"], notes: ["saffron", "jasmine", "ambroxan", "cedar", "amber"] },
  "dior homme intense": { name: "Dior Homme Intense", families: ["floral", "woody"], notes: ["iris", "lavender", "pear", "ambrette", "vetiver", "cedar"] },
  "light blue": { name: "Light Blue Pour Homme", families: ["citrus", "aquatic"], notes: ["grapefruit", "bergamot", "juniper", "black_pepper", "rosemary", "musk", "oakmoss", "frankincense"] },
};

export function findReferenceProfile(text: string): ReferenceProfile | null {
  const q = text.toLowerCase().replace(/[’`]/g, "'");
  for (const [key, profile] of Object.entries(REFERENCE_PROFILES)) {
    if (q.includes(key)) return profile;
  }
  return null;
}
