import { z } from "zod";
import {
  CONCENTRATIONS,
  FRAGRANCE_FAMILIES,
  GENDER_STYLES,
  type Concentration,
  type Fragrance,
} from "@/types/fragrance";
import { NOTE_BY_ID, resolveNoteId } from "@/lib/fragrance/notes";
import { slugify } from "@/lib/fragrance/utils";

/**
 * Normalization & validation shared by every provider adapter.
 * External data is messy: notes have aliases, concentrations are spelled ten
 * ways, prices arrive in mixed currencies. Everything funnels through here.
 */

const unit = z.number().min(0).max(1);
const scale10 = z.number().min(0).max(10);

export const fragranceSchema = z.object({
  id: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(200),
  brand: z.string().min(1).max(200),
  brandSlug: z.string().min(1),
  priceTier: z.enum(["budget", "designer", "niche", "luxury"]),
  concentration: z.enum(CONCENTRATIONS),
  gender: z.enum(GENDER_STYLES),
  releaseYear: z.number().int().min(1700).max(2100),
  description: z.string().max(4000),
  notes: z.object({
    top: z.array(z.string()),
    middle: z.array(z.string()),
    base: z.array(z.string()),
  }),
  families: z.array(z.enum(FRAGRANCE_FAMILIES)).min(1),
  accords: z.array(z.object({ id: z.string(), label: z.string(), strength: z.number().min(0).max(100) })),
  attributes: z.record(z.string(), scale10),
  seasons: z.object({ spring: unit, summer: unit, autumn: unit, winter: unit }),
  occasions: z.object({
    work: unit, school: unit, date: unit, casual: unit, formal: unit, gym: unit, night_out: unit,
  }),
  timeOfDay: z.object({ day: unit, night: unit }),
  longevity: scale10,
  projection: scale10,
  versatility: scale10,
  variants: z
    .array(
      z.object({
        id: z.string(),
        sizeMl: z.number().positive(),
        price: z.number().nonnegative(),
        currency: z.literal("CAD"),
        isSynthetic: z.boolean(),
      }),
    ),
  // May be empty for metadata-only providers; such records are stored but kept
  // out of recommendations until a retail/variant source attaches a price.
  offers: z.array(z.any()),
  popularity: z.number().min(0).max(100),
  rating: z.number().min(0).max(5),
  visual: z.object({
    shape: z.string(),
    liquid: z.string(),
    glass: z.string(),
    cap: z.string(),
    accent: z.string(),
  }),
  imageUrl: z.string().url().nullable(),
  relatedIds: z.array(z.string()),
  isSynthetic: z.boolean(),
  source: z.object({
    providerId: z.string(),
    providerRecordId: z.string(),
    attribution: z.string(),
    license: z.string(),
    sourceUrl: z.string().url().nullable(),
    lastUpdated: z.string(),
  }),
});

export interface ValidationIssue {
  providerRecordId: string;
  message: string;
}

export function validateFragrance(record: unknown):
  | { ok: true; value: Fragrance }
  | { ok: false; message: string } {
  const result = fragranceSchema.safeParse(record);
  if (!result.success) {
    return {
      ok: false,
      message: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    };
  }
  const unknownNotes = [
    ...result.data.notes.top,
    ...result.data.notes.middle,
    ...result.data.notes.base,
  ].filter((id) => !NOTE_BY_ID[id]);
  if (unknownNotes.length) {
    return { ok: false, message: `Unknown note ids: ${unknownNotes.join(", ")}` };
  }
  return { ok: true, value: result.data as unknown as Fragrance };
}

/** Map raw note names to canonical ids, dropping and reporting unknowns. */
export function normalizeNotes(raw: string[]): { ids: string[]; unknown: string[] } {
  const ids: string[] = [];
  const unknown: string[] = [];
  for (const name of raw) {
    const id = resolveNoteId(name);
    if (id) {
      if (!ids.includes(id)) ids.push(id);
    } else unknown.push(name);
  }
  return { ids, unknown };
}

const CONCENTRATION_ALIASES: Record<string, Concentration> = {
  "eau de cologne": "EDC", edc: "EDC", cologne: "EDC",
  "eau de toilette": "EDT", edt: "EDT",
  "eau de parfum": "EDP", edp: "EDP",
  parfum: "Parfum", perfume: "Parfum", "le parfum": "Parfum",
  extrait: "Extrait", "extrait de parfum": "Extrait", elixir: "Extrait",
};

export function normalizeConcentration(raw: string | null | undefined): Concentration {
  const key = (raw ?? "").trim().toLowerCase();
  return CONCENTRATION_ALIASES[key] ?? "EDT";
}

/**
 * Cross-provider identity: two providers describing the same product should
 * produce the same key, so they merge instead of duplicating.
 */
export function dedupeKey(brand: string, name: string, concentration: Concentration): string {
  const cleanName = slugify(name.replace(/\b(eau de (parfum|toilette|cologne)|edp|edt|edc|parfum|extrait)\b/gi, ""));
  return `${slugify(brand)}|${cleanName}|${concentration.toLowerCase()}`;
}

/** Keep the most recently updated record per dedupe key. */
export function dedupe(records: Fragrance[]): { unique: Fragrance[]; duplicates: number } {
  const map = new Map<string, Fragrance>();
  for (const r of records) {
    const key = dedupeKey(r.brand, r.name, r.concentration);
    const prev = map.get(key);
    if (!prev || prev.source.lastUpdated < r.source.lastUpdated) map.set(key, r);
  }
  return { unique: [...map.values()], duplicates: records.length - map.size };
}
