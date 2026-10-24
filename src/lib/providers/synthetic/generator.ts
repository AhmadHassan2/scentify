import { createHash } from "node:crypto";
import {
  ATTRIBUTE_KEYS,
  type Accord,
  type AttributeKey,
  type Concentration,
  type Fragrance,
  type FragranceAttributes,
  type FragranceFamily,
  type FragranceVariant,
  type GenderStyle,
  type Occasion,
  type PriceTier,
  type Season,
} from "@/types/fragrance";
import {
  NOTE_BY_ID,
  NOTE_GROUP_FAMILY,
  NOTE_GROUP_LABELS,
  noteName,
  type NoteGroup,
} from "@/lib/fragrance/notes";
import { OCCASION_META } from "@/lib/fragrance/taxonomy";
import { clamp, slugify, weightedNotes } from "@/lib/fragrance/utils";
import { fragranceSimilarity } from "@/lib/recommendation/similarity";
import { ARCHETYPES, BRANDS, type Archetype, type BrandDefinition, type WeightedPool } from "./archetypes";

/**
 * Deterministic synthetic catalog generator.
 *
 * Notes are sampled from archetype pools; *every other attribute is derived
 * from the notes* (plus concentration), so records stay internally consistent:
 * a dense vanilla-amber extrait will score high for winter evenings and low
 * for hot summer days because its notes are warm and heavy, not by fiat.
 */

export const SYNTHETIC_SEED = 20261023;
export const SYNTHETIC_UPDATED_AT = "2026-10-01T00:00:00.000Z";
export const SYNTHETIC_PROVIDER_ID = "synthetic";

// ── Deterministic helpers ────────────────────────────────────────────────

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable UUID (v5-style layout) derived from a name, so ids survive regeneration. */
export function stableUuid(name: string): string {
  // Namespace predates the Scentify rename; changing it would change every id
  // and break existing wishlists, collections and seeded databases.
  const h = createHash("sha1").update(`scentiq:${name}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${((parseInt(h.slice(16, 18), 16) & 0x3f) | 0x80)
    .toString(16)
    .padStart(2, "0")}${h.slice(18, 20)}-${h.slice(20, 32)}`;
}

type Rng = () => number;

function pickWeighted<T>(rng: Rng, items: Array<[T, number]>): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [item, w] of items) {
    r -= w;
    if (r <= 0) return item;
  }
  return items[items.length - 1][0];
}

function sampleWithout(rng: Rng, pool: WeightedPool, k: number, exclude: Set<string>): string[] {
  const available = pool.filter(([id]) => !exclude.has(id));
  const out: string[] = [];
  while (out.length < k && available.length) {
    const id = pickWeighted(rng, available);
    out.push(id);
    available.splice(available.findIndex(([x]) => x === id), 1);
  }
  return out;
}

function range(rng: Rng, min: number, max: number) {
  return min + rng() * (max - min);
}

const half = (v: number) => Math.round(v * 2) / 2;
const two = (v: number) => Math.round(v * 100) / 100;

// ── Derivation ───────────────────────────────────────────────────────────

const CONCENTRATION_PERFORMANCE: Record<Concentration, { longevity: number; projection: number; price: number }> = {
  EDC: { longevity: 3, projection: 3.5, price: 0.85 },
  EDT: { longevity: 5, projection: 5.25, price: 0.92 },
  EDP: { longevity: 6.6, projection: 6.2, price: 1 },
  Parfum: { longevity: 7.8, projection: 6, price: 1.15 },
  Extrait: { longevity: 8.6, projection: 6.8, price: 1.3 },
};

const TIER_PRICE_100ML: Record<PriceTier, [number, number]> = {
  budget: [34, 72],
  designer: [98, 168],
  niche: [205, 335],
  luxury: [370, 610],
};

const TIER_SIZES: Record<PriceTier, number[][]> = {
  budget: [[100], [50, 100], [100, 200]],
  designer: [[30, 50, 100], [50, 100], [60, 100, 200], [50, 100, 150]],
  niche: [[50, 100], [30, 100], [100]],
  luxury: [[50, 100], [75], [100]],
};

const TIER_POPULARITY: Record<PriceTier, [number, number]> = {
  budget: [25, 80],
  designer: [40, 96],
  niche: [8, 62],
  luxury: [12, 70],
};

function deriveAttributes(notes: Fragrance["notes"], rng: Rng) {
  const wn = weightedNotes({ notes });
  let totalW = 0;
  let warmth = 0;
  let intensity = 0;
  let baseIntensity = 0;
  let baseW = 0;
  const sums = Object.fromEntries(ATTRIBUTE_KEYS.map((k) => [k, 0])) as Record<AttributeKey, number>;
  const peaks = Object.fromEntries(ATTRIBUTE_KEYS.map((k) => [k, 0])) as Record<AttributeKey, number>;
  for (const n of wn) {
    const def = NOTE_BY_ID[n.id];
    const w = n.weight * (0.5 + def.intensity);
    totalW += w;
    warmth += def.warmth * w;
    intensity += def.intensity * w;
    // Top notes evaporate first, so they shape the peak character less.
    const persistence = n.tier === "top" ? 0.72 : 1;
    for (const k of ATTRIBUTE_KEYS) {
      const v = def.profile[k] ?? 0;
      sums[k] += v * w;
      peaks[k] = Math.max(peaks[k], v * persistence * Math.min(1, n.weight / 0.9));
    }
    if (n.tier === "base") {
      baseIntensity += def.intensity * n.weight;
      baseW += n.weight;
    }
  }
  const warmthIndex = warmth / totalW;
  const avgIntensity = intensity / totalW;
  const attrs = {} as FragranceAttributes;
  for (const k of ATTRIBUTE_KEYS) {
    // Blend the overall average with the most prominent note's contribution.
    attrs[k] = 0.5 * (sums[k] / totalW) * 1.6 + 0.58 * peaks[k];
  }
  attrs.warmth = 0.5 * attrs.warmth + 0.5 * (5 + warmthIndex * 5.5);
  attrs.freshness = 0.75 * attrs.freshness + 0.25 * (5 - warmthIndex * 5);
  for (const k of ATTRIBUTE_KEYS) attrs[k] = half(clamp(attrs[k] + range(rng, -0.4, 0.4), 0, 10));
  return { attrs, warmthIndex, avgIntensity, baseIntensity: baseW ? baseIntensity / baseW : 0.5 };
}

function bell(x: number, ideal: number, width: number) {
  return Math.exp(-(((x - ideal) / width) ** 2));
}

function deriveProfile(
  notes: Fragrance["notes"],
  concentration: Concentration,
  rng: Rng,
) {
  const { attrs, warmthIndex, avgIntensity, baseIntensity } = deriveAttributes(notes, rng);
  const perf = CONCENTRATION_PERFORMANCE[concentration];
  const longevity = half(clamp(perf.longevity + (baseIntensity - 0.5) * 4 + warmthIndex * 1.2 + range(rng, -0.6, 0.6), 1.5, 10));
  const projection = half(clamp(perf.projection + (avgIntensity - 0.5) * 6 + range(rng, -0.7, 0.7), 1.5, 10));

  // Thermal character: warm, sweet, dense → cold weather; fresh, light → heat.
  const thermal = clamp(
    0.62 * warmthIndex + 0.04 * (attrs.sweetness - 4) - 0.035 * (attrs.freshness - 5) + 0.025 * (projection - 5.5),
    -1,
    1,
  );
  const seasons: Record<Season, number> = {
    summer: two(clamp(bell(thermal, -0.6, 0.55), 0.06, 1)),
    spring: two(clamp(bell(thermal, -0.22, 0.6), 0.08, 1)),
    autumn: two(clamp(bell(thermal, 0.28, 0.6), 0.08, 1)),
    winter: two(clamp(bell(thermal, 0.62, 0.5), 0.06, 1)),
  };

  const nightLean = clamp(0.5 + 0.5 * thermal + 0.035 * (attrs.sweetness - 4) + 0.03 * (projection - 5.5) + 0.02 * (attrs.smokiness - 2), 0, 1);
  const timeOfDay = { day: two(0.35 + 0.65 * (1 - nightLean)), night: two(0.35 + 0.65 * nightLean) };

  const a = attrs;
  const p = projection;
  const pos = (v: number) => Math.max(0, v);
  const jitter = () => range(rng, -0.04, 0.04);
  const heavy = pos(thermal - 0.45);
  const rich = concentration === "EDP" || concentration === "Parfum" || concentration === "Extrait";
  const raw: Record<Occasion, number> = {
    work: 0.84 - 0.07 * pos(p - 6) - 0.05 * pos(a.sweetness - 5) - 0.06 * pos(a.smokiness - 3.5) - 0.05 * pos(a.warmth - 5.5) - 0.04 * pos(a.muskiness - 6) + 0.02 * (a.freshness - 5) + 0.015 * (a.woodiness - 4) - 0.35 * heavy,
    school: 0.84 - 0.09 * pos(p - 5) - 0.06 * pos(a.sweetness - 6) - 0.07 * pos(a.smokiness - 3) - 0.05 * pos(a.warmth - 5) + 0.03 * (a.freshness - 5) - 0.45 * heavy,
    date: 0.55 + 0.045 * (a.sweetness - 4) + 0.05 * (a.warmth - 4.5) + 0.03 * (a.muskiness - 3) + 0.03 * (a.creaminess - 3) + 0.02 * (a.floralness - 4) + 0.025 * (p - 5.5) - 0.045 * pos(a.freshness - 7),
    casual: 0.78 + 0.03 * (a.freshness - 5) - 0.05 * pos(p - 7) - 0.05 * pos(a.smokiness - 5) + 0.02 * (a.fruitiness - 3) - 0.25 * heavy,
    formal: 0.6 + 0.035 * (a.woodiness - 5) + 0.035 * (a.powderiness - 3) + 0.03 * (a.warmth - 5) + 0.02 * (a.smokiness - 3) + (rich ? 0.07 : -0.05) - 0.05 * pos(a.fruitiness - 6) - 0.05 * pos(a.freshness - 7.5) - 0.06 * pos(a.sweetness - 7),
    gym: 0.32 + 0.08 * (a.freshness - 5) - 0.07 * pos(p - 4.5) - 0.06 * pos(a.sweetness - 3) - 0.05 * pos(a.warmth - 4.5) - 0.05 * pos(a.smokiness - 1),
    night_out: 0.45 + 0.05 * (p - 5.5) + 0.04 * (a.sweetness - 4) + 0.03 * (a.warmth - 4.5) + 0.02 * (a.fruitiness - 3) + 0.025 * (longevity - 6) - 0.03 * pos(a.freshness - 7),
  };
  const occasions = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, two(clamp(v + jitter(), 0.05, 0.98))]),
  ) as Record<Occasion, number>;

  // Versatility = how many seasons and everyday settings it comfortably covers.
  const seasonCoverage = Object.values(seasons).reduce((s, v) => s + Math.min(1, v / 0.6), 0);
  const occasionCoverage = (["work", "casual", "date", "formal", "school"] as const).reduce(
    (s, o) => s + Math.min(1, occasions[o] / 0.65),
    0,
  );
  const versatility = half(clamp(2 + (seasonCoverage + occasionCoverage - 4.6) * 1.75 - 0.4 * pos(p - 7.5), 2, 10));

  return { attrs, longevity, projection, seasons, occasions, timeOfDay, versatility, thermal };
}

function deriveAccords(notes: Fragrance["notes"]): Accord[] {
  const totals = new Map<NoteGroup, number>();
  for (const n of weightedNotes({ notes })) {
    const def = NOTE_BY_ID[n.id];
    const w = n.weight * (0.5 + def.intensity);
    totals.set(def.groups[0], (totals.get(def.groups[0]) ?? 0) + w);
    if (def.groups[1]) totals.set(def.groups[1], (totals.get(def.groups[1]) ?? 0) + w * 0.45);
  }
  const max = Math.max(...totals.values());
  return [...totals.entries()]
    .map(([id, v]) => ({ id, label: NOTE_GROUP_LABELS[id], strength: Math.round((v / max) * 100) }))
    .filter((a) => a.strength >= 18)
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 6);
}

function deriveFamilies(archetype: Archetype, accords: Accord[]): FragranceFamily[] {
  const families = [...archetype.families];
  for (const accord of accords.slice(0, 3)) {
    const fam = NOTE_GROUP_FAMILY[accord.id as NoteGroup];
    if (accord.strength >= 70 && !families.includes(fam) && families.length < 3) families.push(fam);
  }
  return families.slice(0, 3);
}

/**
 * Deterministic enrichment for records from external providers that ship notes
 * but not perceptual attributes, seasons or occasions. Same derivation as the
 * synthetic catalog, with noise disabled.
 */
export function enrichFromNotes(notes: Fragrance["notes"], concentration: Concentration) {
  const noNoise: Rng = () => 0.5;
  const profile = deriveProfile(notes, concentration, noNoise);
  return {
    attributes: profile.attrs,
    longevity: profile.longevity,
    projection: profile.projection,
    seasons: profile.seasons,
    occasions: profile.occasions,
    timeOfDay: profile.timeOfDay,
    versatility: profile.versatility,
    accords: deriveAccords(notes),
  };
}

// ── Copywriting ──────────────────────────────────────────────────────────

function listText(ids: string[]): string {
  const names = ids.map((id) => noteName(id).toLowerCase());
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function wearHours(longevity: number): string {
  if (longevity >= 9) return "12+ hours";
  if (longevity >= 7.5) return "8–10 hours";
  if (longevity >= 6) return "6–8 hours";
  if (longevity >= 4.5) return "4–6 hours";
  return "2–4 hours";
}

function describe(
  rng: Rng,
  archetype: Archetype,
  notes: Fragrance["notes"],
  profile: ReturnType<typeof deriveProfile>,
): string {
  const intro = archetype.intro[Math.floor(rng() * archetype.intro.length)];
  const seasonNames = (Object.entries(profile.seasons) as Array<[Season, number]>)
    .filter(([, v]) => v >= 0.65)
    .sort((a, b) => b[1] - a[1])
    .map(([s]) => s);
  const occ = (Object.entries(profile.occasions) as Array<[Occasion, number]>)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([o]) => OCCASION_META[o].label.toLowerCase());
  const when = seasonNames.length >= 3
    ? "Wearable nearly year-round"
    : seasonNames.length
      ? `Best in ${seasonNames.join(" and ")}`
      : "A distinctive, occasion-specific scent";
  const projectionWord = profile.projection >= 7.5 ? "bold" : profile.projection >= 5.5 ? "moderate" : "close, intimate";
  return `${intro} that opens on ${listText(notes.top.slice(0, 2))}, moves into a heart of ${listText(
    notes.middle.slice(0, 2),
  )} and settles onto ${listText(notes.base.slice(0, 2))}. ${when}, with ${occ.join(" and ")} as natural settings. Expect ${projectionWord} projection and roughly ${wearHours(
    profile.longevity,
  )} of wear.`;
}

// ── Generation ───────────────────────────────────────────────────────────

function chooseBrand(rng: Rng, archetype: Archetype, counts: Map<string, number>): BrandDefinition {
  const candidates = BRANDS.filter((b) => b.specialties.includes(archetype.key));
  // Favour brands with fewer products so the catalog spreads across houses.
  return pickWeighted(
    rng,
    candidates.map((b) => [b, 1 / (1 + (counts.get(b.name) ?? 0))] as [BrandDefinition, number]),
  );
}

function makeName(rng: Rng, archetype: Archetype, used: Set<string>, brand: BrandDefinition): string {
  for (let attempt = 0; attempt < 40; attempt++) {
    const a = archetype.nameA[Math.floor(rng() * archetype.nameA.length)];
    const b = archetype.nameB[Math.floor(rng() * archetype.nameB.length)];
    const pattern = rng();
    const name = pattern < 0.72 ? `${a} ${b}` : pattern < 0.86 ? a : `${a} No. ${Math.floor(range(rng, 2, 19))}`;
    const key = `${brand.name}|${name}`.toLowerCase();
    if (!used.has(name.toLowerCase()) && !used.has(key)) {
      used.add(name.toLowerCase());
      used.add(key);
      return name;
    }
  }
  throw new Error(`Could not generate a unique name for ${archetype.key}`);
}

function makeVariants(rng: Rng, slug: string, tier: PriceTier, concentration: Concentration): FragranceVariant[] {
  const [lo, hi] = TIER_PRICE_100ML[tier];
  const per100 = range(rng, lo, hi) * CONCENTRATION_PERFORMANCE[concentration].price;
  const sizeSets = concentration === "EDC" ? [[100, 200], [150]] : TIER_SIZES[tier];
  const sizes = sizeSets[Math.floor(rng() * sizeSets.length)];
  return sizes.map((sizeMl) => {
    const price = Math.max(25, Math.round((per100 * (sizeMl / 100) ** 0.72) / 5) * 5);
    return {
      id: stableUuid(`${slug}:${sizeMl}`),
      sizeMl,
      price,
      currency: "CAD" as const,
      isSynthetic: true,
    };
  });
}

export function generateSyntheticCatalog(seed = SYNTHETIC_SEED): Fragrance[] {
  const rng = mulberry32(seed);
  const used = new Set<string>();
  const brandCounts = new Map<string, number>();
  const out: Fragrance[] = [];
  let serial = 0;

  for (const archetype of ARCHETYPES) {
    for (let i = 0; i < archetype.count; i++) {
      serial++;
      const brand = chooseBrand(rng, archetype, brandCounts);
      brandCounts.set(brand.name, (brandCounts.get(brand.name) ?? 0) + 1);
      const concentration = pickWeighted(rng, archetype.concentrations);
      const gender: GenderStyle = pickWeighted(rng, archetype.gender);

      const taken = new Set<string>();
      const top = sampleWithout(rng, archetype.top, 2 + Math.floor(rng() * 2), taken);
      top.forEach((n) => taken.add(n));
      const middle = sampleWithout(rng, archetype.middle, 2 + Math.floor(rng() * 2), taken);
      middle.forEach((n) => taken.add(n));
      const base = sampleWithout(rng, archetype.base, 2 + Math.floor(rng() * 2), taken);
      const notes = { top, middle, base };

      const name = makeName(rng, archetype, used, brand);
      const slug = slugify(`${brand.name} ${name}`);
      const profile = deriveProfile(notes, concentration, rng);
      const accords = deriveAccords(notes);
      const [popLo, popHi] = TIER_POPULARITY[brand.tier];
      // A handful of deliberately under-the-radar, well-loved releases.
      const hiddenGem = rng() < 0.16;
      const popularity = Math.round(hiddenGem ? range(rng, 6, 32) : range(rng, popLo, popHi));
      const ratingBase = brand.tier === "niche" || brand.tier === "luxury" ? 3.75 : 3.5;
      const rating = Math.round(clamp(range(rng, ratingBase, ratingBase + 1.05) + (hiddenGem ? 0.3 : 0), 3.2, 4.9) * 10) / 10;

      out.push({
        id: stableUuid(slug),
        slug,
        name,
        brand: brand.name,
        brandSlug: slugify(brand.name),
        priceTier: brand.tier,
        concentration,
        gender,
        releaseYear: Math.floor(range(rng, 2008, 2027)),
        description: describe(rng, archetype, notes, profile),
        notes,
        families: deriveFamilies(archetype, accords),
        accords,
        attributes: profile.attrs,
        seasons: profile.seasons,
        occasions: profile.occasions,
        timeOfDay: profile.timeOfDay,
        longevity: profile.longevity,
        projection: profile.projection,
        versatility: profile.versatility,
        variants: makeVariants(rng, slug, brand.tier, concentration),
        offers: [],
        popularity,
        rating,
        visual: {
          shape: brand.shapes[Math.floor(rng() * brand.shapes.length)],
          liquid: archetype.liquids[Math.floor(rng() * archetype.liquids.length)],
          glass: brand.glass,
          cap: brand.cap,
          accent: "#D8BE8C",
        },
        imageUrl: null,
        relatedIds: [],
        isSynthetic: true,
        source: {
          providerId: SYNTHETIC_PROVIDER_ID,
          providerRecordId: `syn-${String(serial).padStart(4, "0")}`,
          attribution: "Scentify synthetic demonstration dataset — fictional brands, products and prices",
          license: "CC0-1.0 (generated)",
          sourceUrl: null,
          lastUpdated: SYNTHETIC_UPDATED_AT,
        },
      });
    }
  }

  // Related fragrances: precomputed nearest neighbours by content similarity.
  for (const f of out) {
    f.relatedIds = out
      .filter((o) => o.id !== f.id)
      .map((o) => ({ id: o.id, s: fragranceSimilarity(f, o).score }))
      .sort((a, b) => b.s - a.s)
      .slice(0, 6)
      .map((o) => o.id);
  }

  return out.sort((a, b) => a.slug.localeCompare(b.slug));
}
