import { describe, expect, it } from "vitest";
import { parseQuery } from "@/lib/ai/query-parser";

describe("natural-language query parser", () => {
  it("fresh masculine cologne under $150", () => {
    const q = parseQuery("Find me a fresh masculine cologne under $150.");
    expect(q.intent).toBe("recommend");
    expect(q.filters.families).toEqual(expect.arrayContaining(["citrus", "aquatic"]));
    expect(q.filters.maxPrice).toBe(150);
    expect(q.filters.strictBudget).toBe(true);
  });

  it("sweet and strong for winter", () => {
    const q = parseQuery("I want something sweet and strong for winter.");
    expect(q.filters.families).toEqual(expect.arrayContaining(["gourmand"]));
    expect(q.filters.strength).toBe(4);
    expect(q.filters.seasons).toEqual(["winter"]);
  });

  it("date night that isn't too expensive", () => {
    const q = parseQuery("Recommend a date-night fragrance that isn't too expensive.");
    expect(q.filters.occasions).toEqual(["date"]);
    expect(q.filters.maxPrice).toBe(120);
    expect(q.filters.strictBudget).toBe(false);
  });

  it("'I like X. What else should I try?' → similar with a reference profile", () => {
    const q = parseQuery("I like Bleu de Chanel. What else should I try?");
    expect(q.intent).toBe("similar");
    expect(q.reference).toBe("Bleu de Chanel");
    expect(q.referenceProfile?.families).toContain("aromatic");
  });

  it("what should I wear today", () => {
    expect(parseQuery("What fragrance from my collection should I wear today?").intent).toBe("today");
  });

  it("something different → novelty", () => {
    expect(parseQuery("Find something different from my usual preferences").filters.novelty).toBe(true);
  });

  it("hard vs soft note negation", () => {
    const q = parseQuery("woody but no oud, and I don't like tobacco");
    expect(q.filters.families).toContain("woody");
    expect(q.filters.excludedNotes).toEqual(["oud"]);
    expect(q.filters.dislikedNotes).toEqual(["tobacco"]);
    expect(q.filters.likedNotes).toBeUndefined();
  });

  it("liked notes and price ranges", () => {
    const q = parseQuery("something with vetiver and cedarwood between $80 and $200 for the office");
    expect(q.filters.likedNotes).toEqual(expect.arrayContaining(["vetiver", "cedar"]));
    expect(q.filters.minPrice).toBe(80);
    expect(q.filters.maxPrice).toBe(200);
    expect(q.filters.occasions).toEqual(["work"]);
  });

  it("'not too sweet' is a trait, not a request for sweetness", () => {
    const q = parseQuery("a vanilla scent that's not too sweet");
    expect(q.filters.dislikedTraits).toContain("overly_sweet");
    expect(q.filters.likedNotes).toContain("vanilla");
  });

  it("compare intent", () => {
    const q = parseQuery("compare Cobalt Code and Tidal Drift");
    expect(q.intent).toBe("compare");
    expect(q.compareTerms).toEqual(["Cobalt Code", "Tidal Drift"]);
  });

  it("refinements on follow-ups", () => {
    expect(parseQuery("show me cheaper ones").refinements.cheaper).toBe(true);
    expect(parseQuery("something a bit lighter").refinements.lighter).toBe(true);
  });
});
