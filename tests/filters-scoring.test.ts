import { describe, expect, it } from "vitest";
import {
  NEUTRAL_SCORE,
  applyHardFilters,
  combineComponents,
  emptyAdjustments,
  familyMatch,
  noteMatch,
  scoreBudget,
  scoreFragrance,
  scoreOccasion,
  scoreScent,
  scoreSeason,
  scoreStrength,
} from "@/lib/recommendation";
import { makeFragrance, profile, withPrice } from "./fixtures";

describe("hard filters", () => {
  const cheap = withPrice(makeFragrance({ id: "cheap" }), 80);
  const pricey = withPrice(makeFragrance({ id: "pricey" }), 300);
  const oud = makeFragrance({ id: "oud", notes: { top: ["saffron"], middle: ["rose"], base: ["oud"] } });

  it("removes fragrances above a strict maximum budget", () => {
    const { eligible, excluded } = applyHardFilters([cheap, pricey], profile({ budget: { min: 0, max: 150, strict: true, currency: "CAD" } }));
    expect(eligible.map((f) => f.id)).toEqual(["cheap"]);
    expect(excluded[0].reason).toEqual({ kind: "over_budget", price: 300, max: 150 });
  });

  it("keeps over-budget fragrances when the budget is not strict", () => {
    const { eligible } = applyHardFilters([cheap, pricey], profile({ budget: { min: 0, max: 150, strict: false, currency: "CAD" } }));
    expect(eligible).toHaveLength(2);
  });

  it("removes any fragrance containing an excluded note, in any tier", () => {
    const { eligible, excluded } = applyHardFilters([cheap, oud], profile({ excludedNotes: ["oud"] }));
    expect(eligible.map((f) => f.id)).toEqual(["cheap"]);
    expect(excluded[0].reason).toEqual({ kind: "excluded_note", noteId: "oud" });
  });

  it("does NOT exclude softly disliked notes", () => {
    const { eligible } = applyHardFilters([oud], profile({ dislikedNotes: ["oud"] }));
    expect(eligible).toHaveLength(1);
  });

  it("excludes owned fragrances by default, but not when asked to include them", () => {
    const adjustments = { ...emptyAdjustments(), ownedFragranceIds: ["cheap"] };
    expect(applyHardFilters([cheap, pricey], profile(), { adjustments }).eligible.map((f) => f.id)).toEqual(["pricey"]);
    expect(applyHardFilters([cheap, pricey], profile(), { adjustments, excludeOwned: false }).eligible).toHaveLength(2);
  });

  it("excludes hidden (not interested) and explicitly excluded ids", () => {
    const adjustments = { ...emptyAdjustments(), hiddenFragranceIds: ["cheap"] };
    const result = applyHardFilters([cheap, pricey, oud], profile(), { adjustments, excludeIds: ["oud"] });
    expect(result.eligible.map((f) => f.id)).toEqual(["pricey"]);
  });

  it("handles an empty catalog", () => {
    expect(applyHardFilters([], profile())).toEqual({ eligible: [], excluded: [] });
  });
});

describe("scent scoring", () => {
  it("ranks exact family > related family > unrelated family", () => {
    const exact = familyMatch(["woody"], ["woody"]);
    const related = familyMatch(["amber"], ["woody"]);
    const unrelated = familyMatch(["aquatic"], ["gourmand"]);
    expect(exact).toBe(1);
    expect(related).toBeLessThan(exact);
    expect(related).toBeGreaterThan(unrelated);
  });

  it("returns a neutral score when the user has no family or note preference", () => {
    expect(familyMatch(["woody"], [])).toBe(NEUTRAL_SCORE);
    expect(noteMatch(makeFragrance(), []).score).toBe(NEUTRAL_SCORE);
  });

  it("rewards literal note matches more than related notes", () => {
    const withVetiver = makeFragrance({ notes: { top: ["bergamot"], middle: ["vetiver"], base: ["cedar"] } });
    const withPatchouli = makeFragrance({ notes: { top: ["bergamot"], middle: ["patchouli"], base: ["musk"] } });
    const a = noteMatch(withVetiver, ["vetiver"]);
    const b = noteMatch(withPatchouli, ["vetiver"]);
    expect(a.matched).toEqual(["vetiver"]);
    expect(b.matched).toEqual([]);
    expect(a.score).toBeGreaterThan(b.score);
    expect(b.score).toBeGreaterThan(0);
  });

  it("penalizes softly disliked notes without excluding them", () => {
    const f = makeFragrance({ notes: { top: ["bergamot"], middle: ["tobacco"], base: ["vanilla"] } });
    const neutral = scoreScent(f, profile());
    const disliked = scoreScent(f, profile({ dislikedNotes: ["tobacco"] }));
    expect(disliked.score).toBeLessThan(neutral.score);
    expect(disliked.dislikes.notesPresent).toEqual(["tobacco"]);
  });

  it("penalizes disliked traits (e.g. overly sweet) only above their threshold", () => {
    const sweet = makeFragrance({ attributes: { ...makeFragrance().attributes, sweetness: 9 } });
    const dry = makeFragrance({ attributes: { ...makeFragrance().attributes, sweetness: 2 } });
    const p = profile({ dislikedTraits: ["overly_sweet"] });
    expect(scoreScent(sweet, p).dislikes.penalty).toBeGreaterThan(0);
    expect(scoreScent(dry, p).dislikes.penalty).toBe(0);
  });
});

describe("component scoring", () => {
  it("budget: 1 inside the range, decays above a soft maximum, lower below the minimum", () => {
    const p = profile({ budget: { min: 50, max: 150, strict: false, currency: "CAD" } });
    expect(scoreBudget(withPrice(makeFragrance(), 120), p)).toBe(1);
    const over = scoreBudget(withPrice(makeFragrance(), 180), p);
    const wayOver = scoreBudget(withPrice(makeFragrance(), 400), p);
    expect(over).toBeLessThan(1);
    expect(wayOver).toBeLessThan(over);
    expect(wayOver).toBeGreaterThanOrEqual(0);
    expect(scoreBudget(withPrice(makeFragrance(), 30), p)).toBeLessThan(1);
  });

  it("budget: learned soft price ceiling lowers the score of pricier options", () => {
    const p = profile({ budget: { min: 0, max: 500, strict: false, currency: "CAD" } });
    const adj = { ...emptyAdjustments(), softPriceCeiling: 100 };
    expect(scoreBudget(withPrice(makeFragrance(), 200), p, adj)).toBeLessThan(scoreBudget(withPrice(makeFragrance(), 90), p, adj));
  });

  it("occasion: averages selected occasions and respects versatility preference", () => {
    const f = makeFragrance({ versatility: 9 });
    const p = profile({ occasions: ["work", "date"] });
    expect(scoreOccasion(f, p)).toBeCloseTo(0.7 * 0.6 + 0.3 * 0.5, 5);
    expect(scoreOccasion(f, { ...p, versatility: "versatile" })).toBeGreaterThan(scoreOccasion(f, p));
  });

  it("season: averages chosen seasons", () => {
    const f = makeFragrance({ seasons: { spring: 1, summer: 0.2, autumn: 0.5, winter: 0 } });
    expect(scoreSeason(f, profile({ seasons: ["spring", "summer"] }))).toBeCloseTo(0.6);
    expect(scoreSeason(f, profile())).toBe(NEUTRAL_SCORE);
  });

  it("strength: closest projection to the target scores highest", () => {
    const soft = makeFragrance({ projection: 3 });
    const loud = makeFragrance({ projection: 9 });
    expect(scoreStrength(loud, profile({ strength: 5 }))).toBeGreaterThan(scoreStrength(soft, profile({ strength: 5 })));
    expect(scoreStrength(soft, profile({ strength: 1 }))).toBeGreaterThan(scoreStrength(loud, profile({ strength: 1 })));
  });

  it("strength: high longevity importance rewards long-lasting fragrances", () => {
    const longLasting = makeFragrance({ longevity: 10 });
    const fleeting = makeFragrance({ longevity: 2 });
    const p = profile({ longevityImportance: 5 });
    expect(scoreStrength(longLasting, p)).toBeGreaterThan(scoreStrength(fleeting, p));
  });

  it("combines components with normalized, configurable weights", () => {
    const c = { scent: 1, occasion: 0, budget: 0, season: 0, strength: 0 };
    expect(combineComponents(c)).toBeCloseTo(0.35);
    expect(combineComponents(c, { scent: 1, occasion: 0, budget: 0, season: 0, strength: 0 })).toBe(1);
    expect(combineComponents(c, { scent: 0, occasion: 0, budget: 0, season: 0, strength: 0 })).toBe(0);
  });

  it("scores are bounded 0–1 and expose a rounded match percentage", () => {
    const s = scoreFragrance(makeFragrance(), profile({ families: ["aromatic"], likedNotes: ["lavender"] }));
    expect(s.score).toBeGreaterThan(0);
    expect(s.score).toBeLessThanOrEqual(1);
    expect(s.matchPercent).toBe(Math.round(s.score * 100));
    expect(s.reasons.length).toBeGreaterThan(0);
  });
});
