import "server-only";
import type { Fragrance } from "@/types/fragrance";
import { catalogSource } from "@/lib/config";
import { SyntheticFragranceProvider } from "@/lib/providers/synthetic/synthetic-provider";
import { createSupabaseAnonClient } from "./supabase/admin";
import { rowToFragrance, type CatalogRow } from "./mappers";

/**
 * Catalog repository. The catalog is small enough (hundreds to low thousands
 * of records) to score in memory, so we load it once and cache it with a TTL.
 * For a much larger catalog, add a SQL candidate pre-filter (price, excluded
 * notes, families) in `loadFromSupabase` before scoring.
 */

const TTL_MS = 5 * 60 * 1000;

interface CatalogCache {
  loadedAt: number;
  all: Fragrance[];
  byId: Map<string, Fragrance>;
  bySlug: Map<string, Fragrance>;
}

let cache: CatalogCache | null = null;
let inflight: Promise<CatalogCache> | null = null;

async function loadFromSupabase(): Promise<Fragrance[]> {
  const supabase = createSupabaseAnonClient();
  const pageSize = 1000;
  const out: Fragrance[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("catalog_fragrances")
      .select("*")
      .order("slug")
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`Failed to load catalog from Supabase: ${error.message}`);
    out.push(...(data as CatalogRow[]).map(rowToFragrance));
    if (!data || data.length < pageSize) break;
  }
  return out;
}

async function load(): Promise<CatalogCache> {
  let all: Fragrance[];
  if (catalogSource() === "supabase") {
    try {
      all = await loadFromSupabase();
      if (all.length === 0) {
        console.warn("[catalog] Supabase catalog is empty — run `npm run seed`. Falling back to local synthetic data.");
        all = await new SyntheticFragranceProvider().getFragrances();
      }
    } catch (error) {
      console.error("[catalog] Supabase unavailable, falling back to local synthetic data:", error);
      all = await new SyntheticFragranceProvider().getFragrances();
    }
  } else {
    all = await new SyntheticFragranceProvider().getFragrances();
  }
  // Only sellable records (with at least one bottle size) participate.
  all = all.filter((f) => f.variants.length > 0);
  return {
    loadedAt: Date.now(),
    all,
    byId: new Map(all.map((f) => [f.id, f])),
    bySlug: new Map(all.map((f) => [f.slug, f])),
  };
}

async function getCache(): Promise<CatalogCache> {
  if (cache && Date.now() - cache.loadedAt < TTL_MS) return cache;
  inflight ??= load()
    .then((c) => (cache = c))
    .finally(() => (inflight = null));
  return inflight;
}

export async function getCatalog(): Promise<Fragrance[]> {
  return (await getCache()).all;
}

export async function getCatalogIndex(): Promise<Map<string, Fragrance>> {
  return (await getCache()).byId;
}

export async function getFragranceBySlug(slug: string): Promise<Fragrance | null> {
  return (await getCache()).bySlug.get(slug) ?? null;
}

export async function getFragranceById(id: string): Promise<Fragrance | null> {
  return (await getCache()).byId.get(id) ?? null;
}

export async function getFragrancesByIds(ids: string[]): Promise<Fragrance[]> {
  const byId = (await getCache()).byId;
  return ids.map((id) => byId.get(id)).filter((f): f is Fragrance => !!f);
}

export async function getBrands(): Promise<Array<{ slug: string; name: string; count: number }>> {
  const counts = new Map<string, { slug: string; name: string; count: number }>();
  for (const f of await getCatalog()) {
    const entry = counts.get(f.brandSlug) ?? { slug: f.brandSlug, name: f.brand, count: 0 };
    entry.count++;
    counts.set(f.brandSlug, entry);
  }
  return [...counts.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Resolve a free-text reference ("Cobalt Code", a slug or an id) to a catalog record. */
export async function findFragranceByText(text: string): Promise<Fragrance | null> {
  const c = await getCache();
  const direct = c.byId.get(text) ?? c.bySlug.get(text);
  if (direct) return direct;
  const q = text.trim().toLowerCase();
  if (!q) return null;
  return (
    c.all.find((f) => f.name.toLowerCase() === q) ??
    c.all.find((f) => `${f.brand} ${f.name}`.toLowerCase() === q) ??
    c.all.find((f) => q.includes(f.name.toLowerCase()) && f.name.length > 4) ??
    c.all.find((f) => `${f.brand} ${f.name}`.toLowerCase().includes(q) && q.length > 3) ??
    null
  );
}
