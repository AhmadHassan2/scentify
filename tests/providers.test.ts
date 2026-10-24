import { describe, expect, it } from "vitest";
import { FragDBAdapter } from "@/lib/providers/adapters";
import { dedupe, dedupeKey, normalizeConcentration, normalizeNotes, validateFragrance } from "@/lib/providers/normalize";
import { DryRunSink, syncCatalog } from "@/lib/providers/sync";
import { SyntheticFragranceProvider } from "@/lib/providers/synthetic/synthetic-provider";
import type { FragranceDataProvider } from "@/lib/providers/types";
import { catalog, makeFragrance } from "./fixtures";

describe("normalization", () => {
  it("maps note aliases to canonical ids and reports unknowns", () => {
    expect(normalizeNotes(["Cedarwood", "oudh", "Tonka", "unobtainium"])).toEqual({
      ids: ["cedar", "oud", "tonka_bean"],
      unknown: ["unobtainium"],
    });
  });

  it("normalizes concentration spellings", () => {
    expect(normalizeConcentration("Eau de Parfum")).toBe("EDP");
    expect(normalizeConcentration("edt")).toBe("EDT");
    expect(normalizeConcentration("Extrait de Parfum")).toBe("Extrait");
  });

  it("builds the same dedupe key across naming variations", () => {
    expect(dedupeKey("Maison Orvelle", "Velvet Oud Eau de Parfum", "EDP")).toBe(dedupeKey("maison orvelle", "Velvet Oud", "EDP"));
  });

  it("keeps the most recently updated duplicate", () => {
    const older = makeFragrance({ name: "Twin", brand: "House", source: { ...makeFragrance().source, lastUpdated: "2025-01-01" } });
    const newer = makeFragrance({ name: "Twin", brand: "House", source: { ...makeFragrance().source, lastUpdated: "2026-01-01" } });
    const { unique, duplicates } = dedupe([older, newer]);
    expect(duplicates).toBe(1);
    expect(unique[0].id).toBe(newer.id);
  });

  it("validates every synthetic record and rejects malformed ones", () => {
    catalog.forEach((f) => expect(validateFragrance(f).ok).toBe(true));
    expect(validateFragrance({ ...catalog[0], longevity: 42 }).ok).toBe(false);
    const badNotes = validateFragrance({ ...catalog[0], notes: { top: ["not_a_note"], middle: [], base: [] } });
    expect(badNotes.ok).toBe(false);
  });
});

describe("external adapter contract", () => {
  it("normalizes a raw record and derives missing attributes from notes", () => {
    const f = new FragDBAdapter().normalize({
      externalId: "abc-1",
      brand: "Real House",
      name: "Winter Resin",
      concentration: "Eau de Parfum",
      topNotes: ["Cinnamon"],
      middleNotes: ["Labdanum"],
      baseNotes: ["Vanilla", "Amber", "Mystery Note"],
      updatedAt: "2026-05-01T00:00:00Z",
    });
    expect(f).not.toBeNull();
    expect(f!.isSynthetic).toBe(false);
    expect(f!.source.providerId).toBe("fragdb");
    expect(f!.notes.base).toEqual(["vanilla", "amber"]);
    expect(f!.seasons.winter).toBeGreaterThan(f!.seasons.summer);
    expect(f!.variants).toEqual([]);
  });

  it("refuses to run without credentials", async () => {
    await expect(new FragDBAdapter().getFragrances()).rejects.toThrow(/not configured/);
  });
});

describe("sync pipeline", () => {
  it("syncs the synthetic provider end to end", async () => {
    const sink = new DryRunSink();
    const summary = await syncCatalog(new SyntheticFragranceProvider(), sink, { mode: "full", batchSize: 40 });
    expect(summary.status).toBe("succeeded");
    expect(summary.upserted).toBe(catalog.length);
    expect(sink.upserted).toHaveLength(catalog.length);
  });

  it("aborts instead of writing when too many records are invalid", async () => {
    const broken: FragranceDataProvider = {
      metadata: new SyntheticFragranceProvider().metadata,
      getFragrances: async () => catalog.slice(0, 10).map((f) => ({ ...f, rating: 99 })),
      getFragranceById: async () => null,
      getUpdatedFragrances: async () => [],
    };
    const sink = new DryRunSink();
    const summary = await syncCatalog(broken, sink, { mode: "full" });
    expect(summary.status).toBe("failed");
    expect(sink.upserted).toHaveLength(0);
  });
});
