import "server-only";
import type { Fragrance, FragranceFamily, Occasion, Season } from "@/types/fragrance";
import type { DislikedTrait, PreferenceProfile } from "@/types/preferences";
import { FRAGRANCE_FAMILIES, OCCASIONS, SEASONS } from "@/types/fragrance";
import { DISLIKED_TRAITS } from "@/types/preferences";
import { getUserStore } from "@/lib/database/user-store";
import { findFragranceByText } from "@/lib/database/catalog";
import { familyAffinity } from "@/lib/fragrance/families";
import { NOTE_BY_ID, noteName, resolveNoteId } from "@/lib/fragrance/notes";
import { CONCENTRATION_META, FAMILY_META } from "@/lib/fragrance/taxonomy";
import { allNoteIds, cheapestVariant, entryPrice } from "@/lib/fragrance/utils";
import type { Personalization } from "@/lib/personalization";
import {
  findSimilar,
  mergeProfile,
  recommend,
  scoreFragrance,
  type ScoredFragrance,
} from "@/lib/recommendation";
import { SIMILAR_MODES, type SimilarMode } from "@/lib/recommendation/similarity";
import { wearToday } from "@/lib/today";
import { findReferenceProfile } from "./reference-profiles";

/**
 * Backend functions the assistant can call. Both the OpenAI tool-calling path
 * and the local parser path use these, so every fragrance, price and note the
 * assistant mentions comes from our database — never from the model.
 */

export interface ToolResult {
  /** Compact JSON returned to the model. */
  data: unknown;
  /** Real records to render as cards in the chat UI. */
  fragrances: ScoredFragrance[];
}

export interface ToolContext {
  personalization: Personalization;
  city?: string;
}

// ── Argument coercion (LLM output is untrusted input) ───────────────────

const asArray = (v: unknown) => (Array.isArray(v) ? v : typeof v === "string" ? [v] : []);
const pick = <T extends string>(v: unknown, allowed: readonly T[]): T[] =>
  asArray(v).map((x) => String(x).toLowerCase().replace(/\s+/g, "_")).filter((x): x is T => (allowed as readonly string[]).includes(x));
const notes = (v: unknown) => asArray(v).map((x) => resolveNoteId(String(x))).filter((x): x is string => !!x);
const num = (v: unknown, min: number, max: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : undefined;
};

export function profilePatchFromArgs(args: Record<string, unknown>, base: PreferenceProfile): PreferenceProfile {
  const maxPrice = num(args.maxPrice, 0, 5000);
  const minPrice = num(args.minPrice, 0, 5000);
  return mergeProfile(base, {
    families: args.families !== undefined ? pick<FragranceFamily>(args.families, FRAGRANCE_FAMILIES) : undefined,
    likedNotes: args.likedNotes !== undefined ? notes(args.likedNotes) : undefined,
    occasions: args.occasions !== undefined ? pick<Occasion>(args.occasions, OCCASIONS) : undefined,
    seasons: args.seasons !== undefined ? pick<Season>(args.seasons, SEASONS) : undefined,
    strength: num(args.strength, 1, 5),
    longevityImportance: num(args.longevityImportance, 1, 5),
    excludedNotes: [...new Set([...base.excludedNotes, ...notes(args.excludedNotes)])],
    dislikedNotes: [...new Set([...base.dislikedNotes, ...notes(args.dislikedNotes)])],
    dislikedTraits: [...new Set([...base.dislikedTraits, ...pick<DislikedTrait>(args.dislikedTraits, DISLIKED_TRAITS)])],
    budget:
      maxPrice !== undefined || minPrice !== undefined
        ? {
            max: maxPrice ?? base.budget.max,
            min: minPrice ?? 0,
            strict: args.strictBudget === undefined ? maxPrice !== undefined : Boolean(args.strictBudget),
          }
        : undefined,
  });
}

function brief(s: ScoredFragrance) {
  const f = s.fragrance;
  const v = cheapestVariant(f);
  return {
    id: f.id,
    name: f.name,
    brand: f.brand,
    concentration: CONCENTRATION_META[f.concentration].label,
    families: f.families,
    keyNotes: allNoteIds(f).slice(0, 6).map(noteName),
    priceFromCAD: entryPrice(f),
    sizeMl: v.sizeMl,
    longevity: f.longevity,
    projection: f.projection,
    matchPercent: s.matchPercent,
    reasons: s.reasons.slice(0, 3),
    cautions: s.cautions.slice(0, 2),
    demoData: f.isSynthetic,
  };
}

// ── Tools ────────────────────────────────────────────────────────────────

async function recommendFragrances(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
  const p = ctx.personalization;
  let profile = profilePatchFromArgs(args, p.profile);
  const limit = num(args.limit, 1, 8) ?? 5;

  if (args.novelty) {
    // Steer away from the families this user already gravitates to.
    const usual = new Set<FragranceFamily>([
      ...p.profile.families,
      ...p.collection.map((c) => p.catalogIndex.get(c.fragranceId)?.families[0]).filter((f): f is FragranceFamily => !!f),
    ]);
    const novel = FRAGRANCE_FAMILIES.filter(
      (f) => !usual.has(f) && [...usual].every((u) => familyAffinity(u, f) < 0.5),
    );
    profile = { ...profile, families: novel.length ? novel : profile.families, likedNotes: [] };
  }

  const res = recommend([...p.catalogIndex.values()], profile, {
    adjustments: p.adjustments,
    excludeOwned: args.excludeOwned !== false,
    limit,
    diversify: true,
  });
  if (args.novelty) {
    // Explain novelty picks as departures, not as matches to the user's usual families.
    for (const r of res.results) {
      r.reasons = [
        `A ${FAMILY_META[r.fragrance.families[0]].label.toLowerCase()} direction, outside your usual families`,
        ...r.reasons.filter((x) => !x.includes("families you're after")),
      ];
    }
  }
  return {
    data: {
      results: res.results.map(brief),
      totalEligible: res.totalEligible,
      excluded: res.excludedSummary,
      note: res.results.length ? undefined : "No catalog fragrances satisfy these constraints. Suggest relaxing budget or exclusions.",
    },
    fragrances: res.results,
  };
}

async function searchFragrances(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
  const p = ctx.personalization;
  const q = String(args.query ?? "").toLowerCase().trim();
  const fams = pick<FragranceFamily>(args.families, FRAGRANCE_FAMILIES);
  const wanted = notes(args.notes);
  const maxPrice = num(args.maxPrice, 0, 5000);
  const brand = String(args.brand ?? "").toLowerCase();
  const limit = num(args.limit, 1, 10) ?? 6;

  const matches = [...p.catalogIndex.values()].filter((f) => {
    if (q && !`${f.name} ${f.brand} ${allNoteIds(f).map(noteName).join(" ")}`.toLowerCase().includes(q)) return false;
    if (fams.length && !f.families.some((x) => fams.includes(x))) return false;
    if (wanted.length && !wanted.every((n) => allNoteIds(f).includes(n))) return false;
    if (maxPrice !== undefined && entryPrice(f) > maxPrice) return false;
    if (brand && !f.brand.toLowerCase().includes(brand)) return false;
    return true;
  });
  const scored = matches
    .map((f) => scoreFragrance(f, p.profile, p.adjustments))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  return { data: { count: matches.length, results: scored.map(brief) }, fragrances: scored };
}

async function resolve(ref: string): Promise<Fragrance | null> {
  return findFragranceByText(ref);
}

async function compareFragrances(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
  const p = ctx.personalization;
  const refs = asArray(args.fragrances).map(String).slice(0, 3);
  const found: Fragrance[] = [];
  const missing: string[] = [];
  for (const r of refs) {
    const f = await resolve(r);
    if (f) found.push(f);
    else missing.push(r);
  }
  const scored = found.map((f) => scoreFragrance(f, p.profile, p.adjustments));
  return {
    data: {
      compared: scored.map((s) => ({
        ...brief(s),
        seasons: s.fragrance.seasons,
        occasions: s.fragrance.occasions,
        versatility: s.fragrance.versatility,
        accords: s.fragrance.accords.slice(0, 4).map((a) => a.label),
      })),
      notFoundInCatalog: missing,
      compareUrl: found.length >= 2 ? `/compare?ids=${found.map((f) => f.id).join(",")}` : null,
    },
    fragrances: scored,
  };
}

async function getSimilarFragrances(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
  const p = ctx.personalization;
  const ref = String(args.fragrance ?? "");
  const mode = (SIMILAR_MODES as readonly string[]).includes(String(args.mode)) ? (args.mode as SimilarMode) : "similar";
  const target = await resolve(ref);
  const catalog = [...p.catalogIndex.values()];

  if (target) {
    const sims = findSimilar(target, catalog, mode, 5);
    const scored = sims.map((s) => scoreFragrance(s.fragrance, p.profile, p.adjustments));
    return {
      data: {
        target: { id: target.id, name: target.name, brand: target.brand },
        mode,
        results: sims.map((s, i) => ({ ...brief(scored[i]), similarityPercent: Math.round(s.similarity.score * 100), closeness: s.closeness, why: s.reason })),
        disclaimer: "Similarity is computed from listed notes, accords and performance. It does not mean the scents are duplicates.",
      },
      fragrances: scored,
    };
  }

  const reference = findReferenceProfile(ref);
  if (reference) {
    const profile = mergeProfile(p.profile, { families: reference.families, likedNotes: reference.notes.filter((n) => n in NOTE_BY_ID) });
    const res = recommend(catalog, profile, { adjustments: p.adjustments, limit: 5, diversify: true });
    return {
      data: {
        target: null,
        reference: { name: reference.name, approximateNotes: reference.notes.map(noteName), inCatalog: false },
        note: `${reference.name} is not in the Scentify demo catalog. These catalog fragrances match its publicly listed note profile.`,
        results: res.results.map(brief),
      },
      fragrances: res.results,
    };
  }
  return { data: { error: `"${ref}" was not found in the catalog.` }, fragrances: [] };
}

async function getUserCollection(_args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
  const p = ctx.personalization;
  if (!p.user) return { data: { signedIn: false, message: "The user is not signed in, so there is no saved collection." }, fragrances: [] };
  const items = p.collection
    .map((c) => ({ item: c, f: p.catalogIndex.get(c.fragranceId) }))
    .filter((x): x is { item: typeof x.item; f: Fragrance } => !!x.f);
  const scored = items.map((x) => scoreFragrance(x.f, p.profile, p.adjustments));
  return {
    data: {
      signedIn: true,
      count: items.length,
      items: items.map((x, i) => ({ ...brief(scored[i]), favourite: x.item.isFavorite, rating: x.item.rating })),
    },
    fragrances: scored,
  };
}

async function getWeatherRecommendations(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
  const p = ctx.personalization;
  const city = String(args.city ?? ctx.city ?? "").trim();
  const occasion = pick<Occasion>(args.occasion, OCCASIONS)[0] ?? null;
  const today = await wearToday(
    {
      weather: city ? { kind: "city", city } : { kind: "demo", preset: "mild-cloudy" },
      occasion,
      timeOfDay: null,
      desiredProjection: null,
    },
    p,
  );
  const picks = today.picks
    .map((pick) => p.catalogIndex.get(pick.fragrance.id))
    .filter((f): f is Fragrance => !!f)
    .map((f) => scoreFragrance(f, p.profile, p.adjustments));
  return {
    data: {
      weather: {
        location: today.weather.locationName,
        temperatureC: today.weather.temperatureC,
        humidity: today.weather.humidity,
        conditions: today.weather.description,
        isExample: today.weather.source === "demo",
      },
      source: today.source,
      picks: today.picks.map((t) => ({ id: t.fragrance.id, name: t.fragrance.name, brand: t.fragrance.brand, contextMatchPercent: t.matchPercent, reasons: t.reasons, cautions: t.cautions })),
      note: today.note,
      tip: city ? undefined : "No city given — used example weather. Ask the user for their city for live weather.",
    },
    fragrances: picks,
  };
}

async function manageWishlist(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
  const p = ctx.personalization;
  if (!p.user) return { data: { ok: false, message: "The user must sign in to use a wishlist." }, fragrances: [] };
  const action = String(args.action ?? "list");
  const store = getUserStore();
  if (action === "list") {
    const items = (await store.getWishlist(p.user.id))
      .map((w) => p.catalogIndex.get(w.fragranceId))
      .filter((f): f is Fragrance => !!f)
      .map((f) => scoreFragrance(f, p.profile, p.adjustments));
    return { data: { items: items.map(brief) }, fragrances: items };
  }
  const target = await resolve(String(args.fragrance ?? ""));
  if (!target) return { data: { ok: false, message: `"${args.fragrance}" was not found in the catalog.` }, fragrances: [] };
  if (action === "add") await store.addToWishlist(p.user.id, target.id);
  else if (action === "remove") await store.removeFromWishlist(p.user.id, target.id);
  else return { data: { ok: false, message: `Unknown action "${action}"` }, fragrances: [] };
  return {
    data: { ok: true, action, fragrance: { id: target.id, name: target.name, brand: target.brand } },
    fragrances: [scoreFragrance(target, p.profile, p.adjustments)],
  };
}

export const TOOL_IMPLEMENTATIONS: Record<string, (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>> = {
  recommendFragrances,
  searchFragrances,
  compareFragrances,
  getSimilarFragrances,
  getUserCollection,
  getWeatherRecommendations,
  manageWishlist,
};

const familyEnum = { type: "array", items: { type: "string", enum: [...FRAGRANCE_FAMILIES] } };
const stringArray = { type: "array", items: { type: "string" } };

/** OpenAI function-calling definitions. These double as the structured-extraction schema. */
export const TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "recommendFragrances",
      description: "Rank catalog fragrances with the Scentify engine using structured preferences extracted from the conversation. Unspecified fields fall back to the user's saved profile.",
      parameters: {
        type: "object",
        properties: {
          families: { ...familyEnum, description: "'fresh' ≈ citrus/aquatic/aromatic/green; 'sweet' ≈ gourmand/amber" },
          likedNotes: { ...stringArray, description: "Note names, e.g. vetiver, vanilla, bergamot" },
          occasions: { type: "array", items: { type: "string", enum: [...OCCASIONS] } },
          seasons: { type: "array", items: { type: "string", enum: [...SEASONS] } },
          strength: { type: "integer", minimum: 1, maximum: 5, description: "1 skin scent … 5 room-filling" },
          longevityImportance: { type: "integer", minimum: 1, maximum: 5 },
          maxPrice: { type: "number", description: "CAD" },
          minPrice: { type: "number" },
          strictBudget: { type: "boolean", description: "true when the user gave a hard ceiling ('under $150')" },
          excludedNotes: { ...stringArray, description: "Notes the user refuses (hard exclusion)" },
          dislikedNotes: { ...stringArray, description: "Notes the user mildly dislikes (soft penalty)" },
          dislikedTraits: { type: "array", items: { type: "string", enum: [...DISLIKED_TRAITS] } },
          novelty: { type: "boolean", description: "User wants something different from their usual taste" },
          excludeOwned: { type: "boolean" },
          limit: { type: "integer", minimum: 1, maximum: 8 },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "searchFragrances",
      description: "Look up catalog fragrances by name, brand, notes, family or price.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          brand: { type: "string" },
          families: familyEnum,
          notes: stringArray,
          maxPrice: { type: "number" },
          limit: { type: "integer", minimum: 1, maximum: 10 },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compareFragrances",
      description: "Compare 2–3 catalog fragrances side by side (price, notes, seasons, occasions, performance, personal match).",
      parameters: { type: "object", properties: { fragrances: { ...stringArray, description: "Names or ids" } }, required: ["fragrances"] },
    },
  },
  {
    type: "function",
    function: {
      name: "getSimilarFragrances",
      description: "Find catalog fragrances similar to a catalog fragrance, or to a well-known real fragrance by its public note profile.",
      parameters: {
        type: "object",
        properties: {
          fragrance: { type: "string" },
          mode: { type: "string", enum: [...SIMILAR_MODES] },
        },
        required: ["fragrance"],
      },
    },
  },
  {
    type: "function",
    function: { name: "getUserCollection", description: "List the fragrances the signed-in user owns.", parameters: { type: "object", properties: {} } },
  },
  {
    type: "function",
    function: {
      name: "getWeatherRecommendations",
      description: "Pick what to wear today from the user's collection (or the catalog) using live weather for a city.",
      parameters: {
        type: "object",
        properties: { city: { type: "string" }, occasion: { type: "string", enum: [...OCCASIONS] } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "manageWishlist",
      description: "Add, remove or list wishlist fragrances for the signed-in user.",
      parameters: {
        type: "object",
        properties: { action: { type: "string", enum: ["add", "remove", "list"] }, fragrance: { type: "string" } },
        required: ["action"],
      },
    },
  },
] as const;
