import "server-only";
import { FAMILY_META, formatPrice } from "@/lib/fragrance/taxonomy";
import { entryPrice } from "@/lib/fragrance/utils";
import type { ScoredFragrance } from "@/lib/recommendation";
import { listNames } from "@/lib/recommendation/explain";
import { describeFilters, parseQuery, type ParsedFilters } from "./query-parser";
import { TOOL_IMPLEMENTATIONS, type ToolContext } from "./tools";

/**
 * No-LLM assistant: deterministic parsing + the same backend tools + templated
 * replies. Keeps a small structured state so follow-ups ("cheaper", "no oud")
 * refine the previous search instead of starting over.
 */

export interface LocalAssistantState {
  filters: ParsedFilters;
  lastIds: string[];
}

export interface LocalTurn {
  message: string;
  fragrances: ScoredFragrance[];
  toolsUsed: string[];
  appliedFilters: string[];
  state: LocalAssistantState;
}

const TASTE_KEYS: Array<keyof ParsedFilters> = ["families", "likedNotes", "occasions", "seasons"];

function mergeFilters(prev: ParsedFilters, next: ParsedFilters, refinementOnly: boolean): ParsedFilters {
  // A new taste request starts a fresh search but keeps restrictions the user stated.
  const base: ParsedFilters = refinementOnly
    ? { ...prev }
    : {
        excludedNotes: prev.excludedNotes,
        dislikedNotes: prev.dislikedNotes,
        dislikedTraits: prev.dislikedTraits,
        maxPrice: prev.maxPrice,
        minPrice: prev.minPrice,
        strictBudget: prev.strictBudget,
      };
  const merged: ParsedFilters = { ...base, ...next };
  for (const key of ["excludedNotes", "dislikedNotes", "dislikedTraits"] as const) {
    const combined = [...new Set([...(base[key] ?? []), ...(next[key] ?? [])])];
    if (combined.length) (merged as Record<string, unknown>)[key] = combined;
  }
  return merged;
}

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

function cardLine(s: ScoredFragrance): string {
  const f = s.fragrance;
  return `**${f.name}** by ${f.brand} — ${s.reasons[0] ? lowerFirst(s.reasons[0]) : "a strong overall match"} (${s.matchPercent}% match, from ${formatPrice(entryPrice(f))})`;
}

const HELP = `I can search the Scentify catalog for you. Try:
- "Fresh cologne for work under $120"
- "Something sweet and strong for winter, no oud"
- "I like Cobalt Code — what's similar but cheaper?"
- "Compare two fragrances"
- "What should I wear today in Toronto?"`;

export async function runLocalAssistant(
  text: string,
  prevState: LocalAssistantState | undefined,
  ctx: ToolContext,
): Promise<LocalTurn> {
  const parsed = parseQuery(text);
  // State round-trips through the client, so treat it as untrusted and normalize.
  const prev: LocalAssistantState = {
    filters: prevState && typeof prevState.filters === "object" && prevState.filters !== null ? prevState.filters : {},
    lastIds: Array.isArray(prevState?.lastIds) ? prevState.lastIds.filter((x): x is string => typeof x === "string").slice(0, 12) : [],
  };
  const hasTaste = TASTE_KEYS.some((k) => parsed.filters[k] !== undefined);
  const refinementOnly = !hasTaste;
  let filters = mergeFilters(prev.filters, parsed.filters, refinementOnly);
  const p = ctx.personalization;

  // Relative refinements
  const r = parsed.refinements;
  if (r.cheaper) {
    // "Cheaper" = noticeably below what we just showed (or the current ceiling).
    const lastPrices = prev.lastIds.map((id) => p.catalogIndex.get(id)).filter(Boolean).map((f) => entryPrice(f!));
    const typical = lastPrices.length ? lastPrices.reduce((a, b) => a + b, 0) / lastPrices.length : p.profile.budget.max;
    const reference = Math.min(filters.maxPrice ?? Infinity, typical);
    filters = { ...filters, maxPrice: Math.max(30, Math.round((reference * 0.8) / 5) * 5), strictBudget: true };
  }
  if (r.stronger) filters = { ...filters, strength: Math.min(5, (filters.strength ?? p.profile.strength) + 1), longevityImportance: 5 };
  if (r.lighter) filters = { ...filters, strength: Math.max(1, (filters.strength ?? p.profile.strength) - 1) };
  if (r.sweeter) filters = { ...filters, families: [...new Set([...(filters.families ?? []), "gourmand" as const])] };
  if (r.fresher) filters = { ...filters, families: [...new Set([...(filters.families ?? []), "citrus" as const, "aquatic" as const])] };

  const toolsUsed: string[] = [];
  const call = async (name: keyof typeof TOOL_IMPLEMENTATIONS, args: Record<string, unknown>) => {
    toolsUsed.push(name);
    return TOOL_IMPLEMENTATIONS[name](args, ctx);
  };
  const finish = (message: string, fragrances: ScoredFragrance[], applied = describeFilters(filters)): LocalTurn => ({
    message,
    fragrances,
    toolsUsed,
    appliedFilters: applied,
    state: { filters, lastIds: fragrances.length ? fragrances.map((f) => f.fragrance.id) : prev.lastIds },
  });

  switch (parsed.intent) {
    case "help":
      return finish(HELP, [], []);

    case "compare": {
      const res = await call("compareFragrances", { fragrances: parsed.compareTerms });
      const data = res.data as { notFoundInCatalog: string[]; compareUrl: string | null };
      if (res.fragrances.length < 2) {
        return finish(
          `I could only find ${res.fragrances.length ? `**${res.fragrances[0].fragrance.name}**` : "none of those"} in the catalog${
            data.notFoundInCatalog.length ? ` (not found: ${data.notFoundInCatalog.join(", ")})` : ""
          }. Use exact catalog names, or open a fragrance and tap "Compare".`,
          res.fragrances,
          [],
        );
      }
      const [a, b] = res.fragrances;
      const cheaper = entryPrice(a.fragrance) <= entryPrice(b.fragrance) ? a : b;
      const stronger = a.fragrance.projection >= b.fragrance.projection ? a : b;
      const better = a.score >= b.score ? a : b;
      return finish(
        `Here's the quick read: **${better.fragrance.name}** is the closer match to your profile (${better.matchPercent}%), **${cheaper.fragrance.name}** is the more affordable option, and **${stronger.fragrance.name}** projects more. [Open the full side-by-side comparison](${data.compareUrl}).`,
        res.fragrances,
        [],
      );
    }

    case "today": {
      const res = await call("getWeatherRecommendations", { occasion: filters.occasions?.[0] });
      const data = res.data as { weather: { location: string; temperatureC: number; conditions: string; isExample: boolean }; source: string; picks: Array<{ name: string; reasons: string[] }>; note: string | null };
      const where = data.weather.isExample
        ? "example mild weather (tell me your city, or use the Today page, for live conditions)"
        : `${Math.round(data.weather.temperatureC)}°C and ${data.weather.conditions.toLowerCase()} in ${data.weather.location}`;
      const top = data.picks[0];
      return finish(
        `For ${where}, my top pick ${data.source === "collection" ? "from your collection" : "from the catalog"} is **${top?.name ?? "—"}**${
          top?.reasons[0] ? ` — ${lowerFirst(top.reasons[0])}` : ""
        }.${data.note ? ` ${data.note}` : ""}`,
        res.fragrances,
      );
    }

    case "collection": {
      const res = await call("getUserCollection", {});
      const data = res.data as { signedIn: boolean; count?: number };
      if (!data.signedIn) return finish("Sign in to save and view your collection. I can still recommend from the full catalog.", [], []);
      if (!data.count) return finish("Your collection is empty. Open any fragrance and tap \"Add to collection\" to start your shelf.", [], []);
      return finish(`You own ${data.count} fragrance${data.count === 1 ? "" : "s"}. Here they are, ranked by how well each fits your current profile.`, res.fragrances, []);
    }

    case "wishlist_list":
    case "wishlist_add": {
      const res = await call("manageWishlist", { action: parsed.intent === "wishlist_add" ? "add" : "list", fragrance: parsed.reference });
      const data = res.data as { ok?: boolean; message?: string; fragrance?: { name: string } };
      if (data.message) return finish(data.message, [], []);
      if (parsed.intent === "wishlist_add") return finish(`Added **${data.fragrance?.name}** to your wishlist.`, res.fragrances, []);
      return finish(res.fragrances.length ? "Here's your wishlist." : "Your wishlist is empty.", res.fragrances, []);
    }

    case "similar": {
      const res = await call("getSimilarFragrances", { fragrance: parsed.reference, mode: parsed.similarMode });
      const data = res.data as { target: { name: string } | null; reference?: { name: string; approximateNotes: string[] }; error?: string };
      if (data.error) {
        // Unknown reference: fall back to a taste search with whatever we parsed.
        const rec = await call("recommendFragrances", { ...filters, limit: 5 });
        return finish(
          `I couldn't find "${parsed.reference}" in the Scentify catalog${rec.fragrances.length ? ", so here are strong matches for what you described" : ""}.\n\n${rec.fragrances.slice(0, 3).map((s) => `- ${cardLine(s)}`).join("\n")}`,
          rec.fragrances,
        );
      }
      if (data.reference) {
        return finish(
          `${data.reference.name} isn't in our demo catalog (all products here are fictional), but its publicly listed profile — ${listNames(data.reference.approximateNotes.map((n) => n.toLowerCase()), 4)} — points to these:\n\n${res.fragrances.slice(0, 3).map((s) => `- ${cardLine(s)}`).join("\n")}`,
          res.fragrances,
          [`Like ${data.reference.name}`],
        );
      }
      const modeText = { similar: "closest profiles", affordable: "more affordable relatives", stronger: "stronger relatives", lighter: "lighter relatives", versatile: "more versatile relatives" }[parsed.similarMode];
      return finish(
        `Here are the ${modeText} to **${data.target?.name}** — based on shared notes, accords and performance, not claims that they smell identical.\n\n${res.fragrances.slice(0, 3).map((s) => `- ${cardLine(s)}`).join("\n")}`,
        res.fragrances,
        [`Similar to ${data.target?.name}`],
      );
    }

    default: {
      if (!hasTaste && !Object.keys(r).length && !filters.maxPrice && !filters.novelty && !filters.excludedNotes && !filters.strength) {
        return finish(`I didn't catch a scent preference there. ${HELP}`, [], []);
      }
      const res = await call("recommendFragrances", { ...filters, limit: 6 });
      const data = res.data as { totalEligible: number };
      if (!res.fragrances.length) {
        return finish("Nothing in the catalog satisfies all of those constraints. Try a higher budget or fewer exclusions.", []);
      }
      const lead = filters.novelty
        ? "Stepping outside your usual lane, here's what I'd explore:"
        : filters.families?.length
          ? `Here are my top ${FAMILY_META[filters.families[0]].label.toLowerCase()} picks from ${data.totalEligible} eligible fragrances:`
          : `Here are my top picks from ${data.totalEligible} eligible fragrances:`;
      return finish(
        `${lead}\n\n${res.fragrances.slice(0, 3).map((s) => `- ${cardLine(s)}`).join("\n")}\n\nWant them cheaper, stronger, lighter, or without a particular note? Just say so.`,
        res.fragrances,
      );
    }
  }
}
