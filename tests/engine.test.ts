import { describe, expect, it } from "vitest";
import {
  budgetSearch,
  deriveAdjustments,
  discover,
  emptyAdjustments,
  findSimilar,
  fragranceSimilarity,
  rankForContext,
  recommend,
  scoreFragrance,
  temperatureSeasonWeights,
  type WearContext,
} from "@/lib/recommendation";
import { entryPrice, allNoteIds } from "@/lib/fragrance/utils";
import { catalog, makeFragrance, profile } from "./fixtures";

const byId = new Map(catalog.map((f) => [f.id, f]));

describe("ranking", () => {
  it("returns results sorted by score, limited, with an exclusion summary", () => {
    const res = recommend(catalog, profile({ families: ["woody"], excludedNotes: ["oud"] }), { limit: 10 });
    expect(res.results).toHaveLength(10);
    for (let i = 1; i < res.results.length; i++) {
      expect(res.results[i - 1].score).toBeGreaterThanOrEqual(res.results[i].score);
    }
    expect(res.results.every((r) => !allNoteIds(r.fragrance).includes("oud"))).toBe(true);
    expect(res.excludedSummary.excludedNotes.oud).toBeGreaterThan(0);
  });

  it("is deterministic", () => {
    const p = profile({ families: ["citrus", "aquatic"], occasions: ["work"] });
    const a = recommend(catalog, p).results.map((r) => r.fragrance.id);
    const b = recommend(catalog, p).results.map((r) => r.fragrance.id);
    expect(a).toEqual(b);
  });

  it("puts on-profile fragrances first: fresh summer gym lover gets fresh scents", () => {
    const res = recommend(catalog, profile({ families: ["aquatic", "citrus"], seasons: ["summer"], occasions: ["gym"], strength: 2 }), { limit: 5 });
    for (const r of res.results) {
      expect(r.fragrance.attributes.freshness).toBeGreaterThanOrEqual(6);
      expect(r.fragrance.seasons.summer).toBeGreaterThan(r.fragrance.seasons.winter);
    }
  });

  it("puts on-profile fragrances first: sweet winter date-night lover gets warm scents", () => {
    const res = recommend(catalog, profile({ families: ["gourmand", "amber"], seasons: ["winter"], occasions: ["date"], strength: 4 }), { limit: 5 });
    for (const r of res.results) {
      expect(r.fragrance.attributes.warmth).toBeGreaterThanOrEqual(5);
      expect(r.fragrance.seasons.winter).toBeGreaterThan(r.fragrance.seasons.summer);
    }
  });

  it("never returns anything over a strict budget, regardless of scent fit", () => {
    const res = recommend(catalog, profile({ families: ["woody", "smoky"], budget: { min: 0, max: 100, strict: true, currency: "CAD" } }), { limit: 50 });
    expect(res.results.length).toBeGreaterThan(0);
    expect(res.results.every((r) => entryPrice(r.fragrance) <= 100)).toBe(true);
  });

  it("returns an empty list (not an error) when everything is excluded", () => {
    const res = recommend(catalog, profile({ budget: { min: 0, max: 1, strict: true, currency: "CAD" } }));
    expect(res.results).toEqual([]);
    expect(res.excludedSummary.overBudget).toBe(catalog.length);
  });

  it("works with a completely blank profile", () => {
    const res = recommend(catalog, profile());
    expect(res.results.length).toBe(12);
  });

  it("weight overrides change the ranking", () => {
    const p = profile({ families: ["leather"], budget: { min: 0, max: 60, strict: false, currency: "CAD" } });
    const scentHeavy = recommend(catalog, p, { weights: { scent: 1, occasion: 0, budget: 0, season: 0, strength: 0 }, limit: 5 });
    const budgetHeavy = recommend(catalog, p, { weights: { scent: 0.05, occasion: 0, budget: 1, season: 0, strength: 0 }, limit: 5 });
    expect(scentHeavy.results.map((r) => r.fragrance.id)).not.toEqual(budgetHeavy.results.map((r) => r.fragrance.id));
    expect(scentHeavy.results[0].fragrance.families).toContain("leather");
  });

  it("diversified results are not more similar to each other than the plain top list", () => {
    const p = profile({ families: ["aromatic"] });
    const avgPairwise = (ids: string[]) => {
      let sum = 0, n = 0;
      for (let i = 0; i < ids.length; i++)
        for (let j = i + 1; j < ids.length; j++) {
          sum += fragranceSimilarity(byId.get(ids[i])!, byId.get(ids[j])!).score;
          n++;
        }
      return sum / n;
    };
    const plain = recommend(catalog, p, { limit: 8 }).results.map((r) => r.fragrance.id);
    const diverse = recommend(catalog, p, { limit: 8, diversify: true }).results.map((r) => r.fragrance.id);
    expect(avgPairwise(diverse)).toBeLessThanOrEqual(avgPairwise(plain) + 1e-9);
  });
});

describe("explanations", () => {
  it("explains matches and surfaces cautions", () => {
    const f = catalog.find((x) => allNoteIds(x).includes("tobacco"))!;
    const s = scoreFragrance(f, profile({ families: [f.families[0]], dislikedNotes: ["tobacco"], budget: { min: 0, max: 10, strict: false, currency: "CAD" } }));
    expect(s.reasons.join(" ")).toMatch(/families you're after/);
    expect(s.cautions.join(" ")).toMatch(/Tobacco Leaf/);
    expect(s.cautions.join(" ")).toMatch(/over your budget/);
  });
});

describe("similarity", () => {
  const target = catalog[0];
  it("is symmetric and bounded", () => {
    const other = catalog[1];
    const ab = fragranceSimilarity(target, other).score;
    const ba = fragranceSimilarity(other, target).score;
    expect(ab).toBeCloseTo(ba, 10);
    expect(ab).toBeGreaterThanOrEqual(0);
    expect(ab).toBeLessThanOrEqual(1);
    expect(fragranceSimilarity(target, target).score).toBeCloseTo(1, 5);
  });

  it("never returns the target and respects alternative-mode constraints", () => {
    const pricey = [...catalog].sort((a, b) => entryPrice(b) - entryPrice(a))[5];
    const similar = findSimilar(pricey, catalog, "similar");
    expect(similar.some((s) => s.fragrance.id === pricey.id)).toBe(false);
    const cheaper = findSimilar(pricey, catalog, "affordable");
    expect(cheaper.length).toBeGreaterThan(0);
    expect(cheaper.every((s) => entryPrice(s.fragrance) <= entryPrice(pricey) * 0.8)).toBe(true);
    for (const s of findSimilar(pricey, catalog, "lighter")) {
      expect(s.fragrance.projection).toBeLessThanOrEqual(pricey.projection - 1.5);
    }
  });

  it("never labels anything a dupe", () => {
    for (const s of findSimilar(target, catalog, "similar", 20)) {
      expect(s.closeness).not.toMatch(/dupe|clone|identical/i);
    }
  });
});

describe("feedback learning", () => {
  const loved = catalog.find((f) => f.families[0] === "leather")!;
  const p = profile();

  it("'love it' boosts similar fragrances", () => {
    const adj = deriveAdjustments([{ fragranceId: loved.id, type: "love", createdAt: "2026-01-01" }], byId);
    const sibling = findSimilar(loved, catalog, "similar", 1)[0].fragrance;
    expect(scoreFragrance(sibling, p, adj).score).toBeGreaterThan(scoreFragrance(sibling, p).score);
  });

  it("is reversible: removing feedback restores neutral adjustments", () => {
    const adj = deriveAdjustments([], byId);
    expect(adj).toEqual(emptyAdjustments());
  });

  it("'not interested' hides, 'own' marks owned, price/sweet/strength feedback set caps", () => {
    const f = catalog.find((x) => x.attributes.sweetness >= 7)!;
    const adj = deriveAdjustments(
      [
        { fragranceId: f.id, type: "not_interested", createdAt: "2026-01-01" },
        { fragranceId: loved.id, type: "own", createdAt: "2026-01-02" },
        { fragranceId: f.id, type: "too_expensive", createdAt: "2026-01-03" },
        { fragranceId: f.id, type: "too_sweet", createdAt: "2026-01-04" },
        { fragranceId: f.id, type: "too_strong", createdAt: "2026-01-05" },
      ],
      byId,
    );
    expect(adj.hiddenFragranceIds).toContain(f.id);
    expect(adj.ownedFragranceIds).toContain(loved.id);
    expect(adj.softPriceCeiling).toBeLessThan(entryPrice(f));
    expect(adj.attributeCaps.sweetness).toBeLessThan(f.attributes.sweetness);
    expect(adj.projectionCap).toBeLessThan(f.projection);
  });
});

describe("weather context", () => {
  const ctx = (overrides: Partial<WearContext>): WearContext => ({
    temperatureC: 20, humidity: 50, condition: "clear", season: "spring",
    timeOfDay: "afternoon", occasion: null, desiredProjection: null, ...overrides,
  });

  it("interpolates temperature into season weights that sum to 1", () => {
    for (const t of [-20, 0, 8, 15, 22, 35]) {
      const w = temperatureSeasonWeights(t);
      expect(w.winter + w.spring + w.summer + w.autumn).toBeCloseTo(1, 5);
    }
  });

  it("hot humid afternoon favours fresh scents; snowy evening favours warm ones", () => {
    const hot = rankForContext(catalog, ctx({ temperatureC: 31, humidity: 80, season: "summer" }), {}, 3);
    hot.forEach((r) => expect(r.fragrance.attributes.freshness).toBeGreaterThanOrEqual(6));
    const cold = rankForContext(catalog, ctx({ temperatureC: -6, humidity: 60, condition: "snow", season: "winter", timeOfDay: "evening" }), {}, 3);
    cold.forEach((r) => expect(r.fragrance.attributes.warmth).toBeGreaterThanOrEqual(5.5));
  });

  it("ranks a favourite higher than an otherwise identical non-favourite", () => {
    const a = makeFragrance({ id: "a" });
    const b = makeFragrance({ id: "b" });
    const collection = new Map([["b", { fragranceId: "b", addedAt: "", isFavorite: true, rating: 5, personalNotes: null, sizeMl: null }]]);
    const ranked = rankForContext([a, b], ctx({}), { collection }, 2);
    expect(ranked[0].fragrance.id).toBe("b");
  });
});

describe("discovery", () => {
  it("builds sections with explanations and avoids repeating fragrances across shelves", () => {
    const sections = discover(catalog, { profile: profile({ families: ["woody"] }), perSection: 6 });
    const ids = sections.flatMap((s) => s.items.map((i) => i.fragrance.id));
    const unique = new Set(ids);
    expect(unique.size / ids.length).toBeGreaterThan(0.85);
    sections.forEach((s) => s.items.forEach((i) => expect(i.reason.length).toBeGreaterThan(10)));
  });

  it("'outside your comfort zone' avoids the user's own families", () => {
    const sections = discover(catalog, { profile: profile({ families: ["aquatic", "citrus"] }) });
    const zone = sections.find((s) => s.id === "comfort_zone")!;
    expect(zone.items.length).toBeGreaterThan(0);
    zone.items.forEach((i) => expect(["aquatic", "citrus"]).not.toContain(i.fragrance.families[0]));
  });

  it("similar-to-favourites is empty with a hint when there are no favourites", () => {
    const s = discover(catalog, { profile: profile() }).find((x) => x.id === "similar_favorites")!;
    expect(s.items).toEqual([]);
    expect(s.emptyHint).toBeTruthy();
  });
});

describe("budget search", () => {
  const filters = {
    minPrice: 0, maxPrice: 100, strict: true, brands: [], families: [], sizesMl: [],
    seasons: [], occasions: [], minLongevity: 0, sort: "price_asc" as const,
  };

  it("respects a strict maximum per variant and sorts by price", () => {
    const { results } = budgetSearch(catalog, filters, profile());
    expect(results.length).toBeGreaterThan(0);
    results.forEach((r) => expect(r.variant.price).toBeLessThanOrEqual(100));
    for (let i = 1; i < results.length; i++) expect(results[i].variant.price).toBeGreaterThanOrEqual(results[i - 1].variant.price);
  });

  it("filters by bottle size and family", () => {
    const { results } = budgetSearch(catalog, { ...filters, maxPrice: 1000, sizesMl: [100], families: ["woody"] }, profile());
    results.forEach((r) => {
      expect(r.variant.sizeMl).toBe(100);
      expect(r.fragrance.families).toContain("woody");
    });
  });
});

describe("synthetic dataset integrity", () => {
  it("has 100–150 records, all flagged synthetic with provenance", () => {
    expect(catalog.length).toBeGreaterThanOrEqual(100);
    expect(catalog.length).toBeLessThanOrEqual(150);
    catalog.forEach((f) => {
      expect(f.isSynthetic).toBe(true);
      expect(f.source.providerId).toBe("synthetic");
      expect(f.variants.length).toBeGreaterThan(0);
    });
  });

  it("has unique ids and slugs and valid related ids", () => {
    expect(new Set(catalog.map((f) => f.id)).size).toBe(catalog.length);
    expect(new Set(catalog.map((f) => f.slug)).size).toBe(catalog.length);
    catalog.forEach((f) => f.relatedIds.forEach((id) => expect(byId.has(id)).toBe(true)));
  });

  it("is internally consistent: warm, sweet fragrances lean winter; very fresh ones lean summer", () => {
    for (const f of catalog) {
      if (f.attributes.warmth >= 7 && f.attributes.sweetness >= 6) expect(f.seasons.winter).toBeGreaterThan(f.seasons.summer);
      if (f.attributes.freshness >= 8 && f.attributes.warmth <= 2.5) expect(f.seasons.summer).toBeGreaterThan(f.seasons.winter);
    }
  });
});
