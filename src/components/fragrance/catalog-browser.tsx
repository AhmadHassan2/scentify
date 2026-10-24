"use client";

import * as React from "react";
import Link from "next/link";
import { Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import type { FragranceFamily, FragranceSummary } from "@/types/fragrance";
import { FRAGRANCE_FAMILIES } from "@/types/fragrance";
import { useMatchScores } from "@/hooks/use-match-scores";
import { FAMILY_META } from "@/lib/fragrance/taxonomy";
import { noteName } from "@/lib/fragrance/notes";
import { Button } from "@/components/ui/button";
import { Chip, Input, Select } from "@/components/ui/primitives";
import { EmptyState } from "@/components/ui/states";
import { FragranceCard, FragranceGrid } from "./fragrance-card";

type Sort = "match" | "rating" | "price_asc" | "price_desc" | "name";
const PAGE = 24;

export function CatalogBrowser({ fragrances }: { fragrances: FragranceSummary[] }) {
  const [query, setQuery] = React.useState("");
  const [families, setFamilies] = React.useState<FragranceFamily[]>([]);
  const [sortChoice, setSort] = React.useState<Sort | null>(null);
  const allIds = React.useMemo(() => fragrances.map((f) => f.id), [fragrances]);
  const { scores, hasProfile } = useMatchScores(allIds);
  // Default to "best match" once we know the visitor has a profile.
  const sort: Sort = sortChoice ?? (hasProfile ? "match" : "rating");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = fragrances.filter((f) => {
      if (families.length && !f.families.some((x) => families.includes(x))) return false;
      if (!q) return true;
      return `${f.name} ${f.brand} ${f.topNotes.map(noteName).join(" ")} ${f.families.join(" ")}`.toLowerCase().includes(q);
    });
    const sorters: Record<Sort, (a: FragranceSummary, b: FragranceSummary) => number> = {
      match: (a, b) => (scores[b.id]?.matchPercent ?? 0) - (scores[a.id]?.matchPercent ?? 0),
      rating: (a, b) => b.rating - a.rating,
      price_asc: (a, b) => a.priceFrom - b.priceFrom,
      price_desc: (a, b) => b.priceFrom - a.priceFrom,
      name: (a, b) => a.name.localeCompare(b.name),
    };
    return [...list].sort((a, b) => sorters[sort](a, b) || a.name.localeCompare(b.name));
  }, [fragrances, query, families, sort, scores]);

  // Paging resets whenever the filters change.
  const filterKey = `${query}|${families.join(",")}|${sort}`;
  const [paging, setPaging] = React.useState({ key: filterKey, count: PAGE });
  const visible = paging.key === filterKey ? paging.count : PAGE;
  const showMore = () => setPaging({ key: filterKey, count: visible + PAGE });

  const toggleFamily = (f: FragranceFamily) =>
    setFamilies((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));

  return (
    <div>
      <div className="surface sticky top-16 z-20 -mx-1 mb-8 rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-dim" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, house or note — try “vetiver”"
              aria-label="Search fragrances"
              className="pl-11"
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-dim hover:text-ivory">
                <X className="size-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-dim" aria-hidden />
            <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort by" className="sm:w-52">
              {hasProfile && <option value="match">Best match for you</option>}
              <option value="rating">Highest rated</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
              <option value="name">Name A–Z</option>
            </Select>
          </div>
        </div>
        <div className="scrollbar-none -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-0.5">
          {FRAGRANCE_FAMILIES.map((f) => (
            <Chip key={f} selected={families.includes(f)} onClick={() => toggleFamily(f)} className="shrink-0">
              <span className="size-2 rounded-full" style={{ background: FAMILY_META[f].tone }} aria-hidden />
              {FAMILY_META[f].label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-mist" aria-live="polite">
          {filtered.length} fragrance{filtered.length === 1 ? "" : "s"}
          {families.length > 0 && (
            <button onClick={() => setFamilies([])} className="ml-3 text-xs text-champagne hover:underline">
              Clear families
            </button>
          )}
        </p>
        {!hasProfile && (
          <Link href="/quiz" className="inline-flex items-center gap-1.5 text-xs text-champagne hover:underline">
            <Sparkles className="size-3.5" /> Take the quiz to see your match on every fragrance
          </Link>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No fragrances match that"
          description="Try a different note or house name, or clear the family filters."
          action={
            <Button variant="secondary" onClick={() => { setQuery(""); setFamilies([]); }}>
              Reset filters
            </Button>
          }
        />
      ) : (
        <>
          <FragranceGrid>
            {filtered.slice(0, visible).map((f, i) => (
              <FragranceCard key={f.id} fragrance={f} matchPercent={scores[f.id]?.matchPercent ?? null} priority={i < 8} />
            ))}
          </FragranceGrid>
          {visible < filtered.length && (
            <div className="mt-10 flex justify-center">
              <Button variant="secondary" onClick={showMore}>
                Show more ({filtered.length - visible} remaining)
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
