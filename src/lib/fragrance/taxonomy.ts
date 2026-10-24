import type {
  AttributeKey,
  Concentration,
  FragranceFamily,
  Occasion,
  Season,
} from "@/types/fragrance";
import type { DislikedTrait } from "@/types/preferences";

export const FAMILY_META: Record<
  FragranceFamily,
  { label: string; description: string; tone: string }
> = {
  citrus: { label: "Citrus", description: "Bright bergamot, lemon and grapefruit", tone: "#E7C766" },
  aquatic: { label: "Aquatic", description: "Sea air, salt and cool water", tone: "#7FB4C9" },
  aromatic: { label: "Aromatic", description: "Lavender, sage and herbs", tone: "#9AAE8C" },
  green: { label: "Green", description: "Leaves, tea and crushed stems", tone: "#86A06B" },
  floral: { label: "Floral", description: "Rose, iris and white petals", tone: "#D9A3A8" },
  fruity: { label: "Fruity", description: "Juicy apple, pineapple and cassis", tone: "#E39A6B" },
  woody: { label: "Woody", description: "Cedar, vetiver and sandalwood", tone: "#A7825A" },
  spicy: { label: "Spicy", description: "Pepper, cardamom and cinnamon", tone: "#C46F45" },
  amber: { label: "Amber", description: "Resins, labdanum and warm glow", tone: "#C98B3E" },
  gourmand: { label: "Sweet & Gourmand", description: "Vanilla, tonka and caramel", tone: "#B9875F" },
  leather: { label: "Leather", description: "Suede, birch and saddle", tone: "#7A5642" },
  smoky: { label: "Smoky", description: "Incense, tobacco and embers", tone: "#77706A" },
  musky: { label: "Musky", description: "Clean skin, soft musks", tone: "#C9BBAA" },
};

export const SEASON_META: Record<Season, { label: string }> = {
  spring: { label: "Spring" },
  summer: { label: "Summer" },
  autumn: { label: "Autumn" },
  winter: { label: "Winter" },
};

export const OCCASION_META: Record<Occasion, { label: string; description: string }> = {
  work: { label: "Work", description: "Office-safe and polished" },
  school: { label: "School", description: "Light, easy, inoffensive" },
  date: { label: "Date Night", description: "Close, warm and memorable" },
  casual: { label: "Casual Outing", description: "Relaxed everyday wear" },
  formal: { label: "Formal Event", description: "Refined and elegant" },
  gym: { label: "Gym", description: "Clean and very light" },
  night_out: { label: "Night Out", description: "Bold, loud and fun" },
};

export const CONCENTRATION_META: Record<Concentration, { label: string }> = {
  EDC: { label: "Eau de Cologne" },
  EDT: { label: "Eau de Toilette" },
  EDP: { label: "Eau de Parfum" },
  Parfum: { label: "Parfum" },
  Extrait: { label: "Extrait de Parfum" },
};

export const ATTRIBUTE_META: Record<AttributeKey, { label: string }> = {
  freshness: { label: "Freshness" },
  sweetness: { label: "Sweetness" },
  woodiness: { label: "Woodiness" },
  spiciness: { label: "Spiciness" },
  warmth: { label: "Warmth" },
  floralness: { label: "Floral" },
  fruitiness: { label: "Fruity" },
  greenness: { label: "Green" },
  smokiness: { label: "Smoky" },
  creaminess: { label: "Creamy" },
  powderiness: { label: "Powdery" },
  muskiness: { label: "Musky" },
};

/** Characteristic dislikes and the attribute threshold above which they apply. */
export const DISLIKED_TRAIT_META: Record<
  DislikedTrait,
  { label: string; attribute: AttributeKey | "projection"; threshold: number }
> = {
  overly_sweet: { label: "Overly sweet", attribute: "sweetness", threshold: 6.5 },
  too_strong: { label: "Very strong projection", attribute: "projection", threshold: 7.5 },
  heavy_musk: { label: "Heavy musk", attribute: "muskiness", threshold: 6 },
  strong_leather: { label: "Strong leather / smoke", attribute: "smokiness", threshold: 6 },
  smoky: { label: "Smoky / incense", attribute: "smokiness", threshold: 5 },
  powdery: { label: "Powdery", attribute: "powderiness", threshold: 5 },
  very_floral: { label: "Very floral", attribute: "floralness", threshold: 6.5 },
};

export const STRENGTH_LABELS: Record<number, string> = {
  1: "Skin scent",
  2: "Soft",
  3: "Moderate",
  4: "Strong",
  5: "Room-filling",
};

export const LONGEVITY_LABELS: Record<number, string> = {
  1: "Doesn't matter",
  2: "A few hours is fine",
  3: "Half a day",
  4: "Most of the day",
  5: "All day and beyond",
};

export function performanceLabel(value: number): string {
  if (value >= 8.5) return "Exceptional";
  if (value >= 7) return "Strong";
  if (value >= 5) return "Moderate";
  if (value >= 3.5) return "Soft";
  return "Intimate";
}

export function formatPrice(amount: number, currency = "CAD"): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
