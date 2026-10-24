import type { Fragrance } from "@/types/fragrance";
import type { PreferenceProfile } from "@/types/preferences";
import { defaultProfile } from "@/lib/recommendation";
import catalogJson from "@/lib/providers/synthetic/synthetic-fragrances.json";

export const catalog = catalogJson as unknown as Fragrance[];

let counter = 0;

/** Minimal, fully-specified fragrance for focused unit tests. */
export function makeFragrance(overrides: Partial<Fragrance> = {}): Fragrance {
  counter++;
  const id = overrides.id ?? `test-${counter}`;
  const base: Fragrance = {
    id,
    slug: id,
    name: `Test ${counter}`,
    brand: "Test House",
    brandSlug: "test-house",
    priceTier: "designer",
    concentration: "EDP",
    gender: "unisex",
    releaseYear: 2024,
    description: "A test fragrance.",
    notes: { top: ["bergamot"], middle: ["lavender"], base: ["cedar"] },
    families: ["aromatic"],
    accords: [{ id: "aromatic", label: "Aromatic", strength: 100 }],
    attributes: {
      freshness: 5, sweetness: 3, woodiness: 5, spiciness: 2, warmth: 4, floralness: 2,
      fruitiness: 1, greenness: 2, smokiness: 1, creaminess: 1, powderiness: 1, muskiness: 2,
    },
    seasons: { spring: 0.7, summer: 0.6, autumn: 0.6, winter: 0.4 },
    occasions: { work: 0.7, school: 0.7, date: 0.5, casual: 0.7, formal: 0.5, gym: 0.3, night_out: 0.4 },
    timeOfDay: { day: 0.7, night: 0.5 },
    longevity: 6,
    projection: 5.5,
    versatility: 7,
    variants: [{ id: `${id}-100`, sizeMl: 100, price: 120, currency: "CAD", isSynthetic: true }],
    offers: [],
    popularity: 50,
    rating: 4,
    visual: { shape: "tall", liquid: "#fff", glass: "#fff", cap: "#000", accent: "#000" },
    imageUrl: null,
    relatedIds: [],
    isSynthetic: true,
    source: {
      providerId: "test",
      providerRecordId: id,
      attribution: "test",
      license: "test",
      sourceUrl: null,
      lastUpdated: "2026-01-01T00:00:00.000Z",
    },
  };
  return { ...base, ...overrides };
}

export function profile(overrides: Partial<PreferenceProfile> = {}): PreferenceProfile {
  const p = defaultProfile();
  return { ...p, ...overrides, budget: { ...p.budget, ...(overrides.budget ?? {}) } };
}

export function withPrice(f: Fragrance, price: number, sizeMl = 100): Fragrance {
  return { ...f, variants: [{ id: `${f.id}-${sizeMl}`, sizeMl, price, currency: "CAD", isSynthetic: true }] };
}
