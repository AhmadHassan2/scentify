"use client";

import * as React from "react";
import { RotateCcw, SlidersHorizontal, Wallet } from "lucide-react";
import type { RecommendationDTO } from "@/types/dto";
import { FRAGRANCE_FAMILIES, OCCASIONS, SEASONS, type FragranceFamily, type Occasion, type Season } from "@/types/fragrance";
import type { BudgetSort } from "@/lib/recommendation/budget";
import { useApp } from "@/components/providers/app-provider";
import { FragranceCard, FragranceCardSkeleton, FragranceGrid } from "@/components/fragrance/fragrance-card";
import { Button } from "@/components/ui/button";
import { Chip, Input, Label, Select } from "@/components/ui/primitives";
import { Dialog, DialogContent, DialogTrigger, Slider, Switch } from "@/components/ui/overlays";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { apiPost } from "@/lib/client/api";
import { useApiQuery, useDebouncedValue } from "@/hooks/use-api-query";
import { FAMILY_META, OCCASION_META, SEASON_META, formatPrice } from "@/lib/fragrance/taxonomy";

interface BudgetResult extends RecommendationDTO {
  variant: { sizeMl: number; price: number; currency: string };
}

interface Filters {
  minPrice: number;
  maxPrice: number;
  strict: boolean;
  brands: string[];
  families: FragranceFamily[];
  sizesMl: number[];
  seasons: Season[];
  occasions: Occasion[];
  minLongevity: number;
  sort: BudgetSort;
}

const DEFAULTS: Filters = {
  minPrice: 0, maxPrice: 150, strict: true, brands: [], families: [], sizesMl: [],
  seasons: [], occasions: [], minLongevity: 0, sort: "score",
};
const SIZES = [30, 50, 60, 75, 100, 150, 200];

function toggle<T>(list: T[], v: T) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-t border-ivory/[0.07] pt-5">
      <legend className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-dim">{title}</legend>
      {children}
    </fieldset>
  );
}

function FilterPanel({ filters, set, brands }: { filters: Filters; set: (p: Partial<Filters>) => void; brands: Array<{ slug: string; name: string; count: number }> }) {
  return (
    <div className="space-y-5">
      <div>
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="min-price">Min (CAD)</Label>
            <Input id="min-price" type="number" inputMode="numeric" min={0} max={filters.maxPrice} value={filters.minPrice}
              onChange={(e) => set({ minPrice: Math.max(0, Math.min(Number(e.target.value) || 0, filters.maxPrice)) })} />
          </div>
          <div>
            <Label htmlFor="max-price">Max (CAD)</Label>
            <Input id="max-price" type="number" inputMode="numeric" min={filters.minPrice} max={1000} value={filters.maxPrice}
              onChange={(e) => set({ maxPrice: Math.max(filters.minPrice, Math.min(Number(e.target.value) || 0, 1000)) })} />
          </div>
        </div>
        <Slider min={0} max={700} step={5} value={[filters.minPrice, Math.min(700, filters.maxPrice)]} thumbLabels={["Minimum price", "Maximum price"]}
          onValueChange={([a, b]) => set({ minPrice: a, maxPrice: b })} />
        <label className="mt-5 flex cursor-pointer items-center justify-between gap-3 text-sm text-parchment">
          <span>
            Strict maximum
            <span className="block text-xs text-dim">{filters.strict ? "Never show anything above max" : "Allow close matches slightly above"}</span>
          </span>
          <Switch checked={filters.strict} onCheckedChange={(v) => set({ strict: v })} aria-label="Strict maximum" />
        </label>
        <div className="mt-4">
          <Label htmlFor="currency">Currency</Label>
          <Select id="currency" value="CAD" onChange={() => undefined}>
            <option value="CAD">CAD — Canadian dollar</option>
            <option value="USD" disabled>USD (coming with retailer data)</option>
            <option value="EUR" disabled>EUR (coming with retailer data)</option>
          </Select>
        </div>
      </div>

      <FilterGroup title="Scent family">
        <div className="flex flex-wrap gap-2">
          {FRAGRANCE_FAMILIES.map((f) => (
            <Chip key={f} selected={filters.families.includes(f)} onClick={() => set({ families: toggle(filters.families, f) })}>
              {FAMILY_META[f].label}
            </Chip>
          ))}
        </div>
      </FilterGroup>
      <FilterGroup title="Bottle size">
        <div className="flex flex-wrap gap-2">
          {SIZES.map((s) => (
            <Chip key={s} selected={filters.sizesMl.includes(s)} onClick={() => set({ sizesMl: toggle(filters.sizesMl, s) })}>{s} ml</Chip>
          ))}
        </div>
      </FilterGroup>
      <FilterGroup title="Season">
        <div className="flex flex-wrap gap-2">
          {SEASONS.map((s) => (
            <Chip key={s} selected={filters.seasons.includes(s)} onClick={() => set({ seasons: toggle(filters.seasons, s) })}>{SEASON_META[s].label}</Chip>
          ))}
        </div>
      </FilterGroup>
      <FilterGroup title="Occasion">
        <div className="flex flex-wrap gap-2">
          {OCCASIONS.map((o) => (
            <Chip key={o} selected={filters.occasions.includes(o)} onClick={() => set({ occasions: toggle(filters.occasions, o) })}>{OCCASION_META[o].label}</Chip>
          ))}
        </div>
      </FilterGroup>
      <FilterGroup title={`Minimum longevity · ${filters.minLongevity ? `${filters.minLongevity}/10` : "any"}`}>
        <Slider min={0} max={9} step={1} value={[filters.minLongevity]} thumbLabels={["Minimum longevity"]} onValueChange={([v]) => set({ minLongevity: v })} />
      </FilterGroup>
      <FilterGroup title="Brand">
        <div className="flex flex-wrap gap-2">
          {brands.map((b) => (
            <Chip key={b.slug} selected={filters.brands.includes(b.slug)} onClick={() => set({ brands: toggle(filters.brands, b.slug) })}>
              {b.name} <span className="text-dim">{b.count}</span>
            </Chip>
          ))}
        </div>
      </FilterGroup>
    </div>
  );
}

export function BudgetFinder({ brands }: { brands: Array<{ slug: string; name: string; count: number }> }) {
  const { ready, personalization, profile, feedback } = useApp();
  const [filters, setFilters] = React.useState<Filters>(DEFAULTS);
  const [seeded, setSeeded] = React.useState(false);
  const set = (p: Partial<Filters>) => setFilters((f) => ({ ...f, ...p }));

  // Start from the user's saved budget once it's known (adjusting state during render).
  if (ready && profile && !seeded) {
    setSeeded(true);
    setFilters((f) => ({ ...f, minPrice: profile.budget.min, maxPrice: profile.budget.max || 150 }));
  }

  const debounced = useDebouncedValue(filters, 250);
  const body = { filters: debounced, limit: 48, ...personalization };
  const query = useApiQuery<{ results: BudgetResult[]; total: number }>(
    ready ? JSON.stringify({ body, fb: feedback.length }) : null,
    (signal) => apiPost("/api/budget", body, { signal }),
  );
  const results = query.data?.results ?? null;
  const total = query.data?.total ?? 0;
  const error = query.error;
  const loading = query.loading || debounced !== filters;

  const activeCount =
    filters.brands.length + filters.families.length + filters.sizesMl.length + filters.seasons.length + filters.occasions.length + (filters.minLongevity ? 1 : 0);

  return (
    <div className="grid gap-8 lg:grid-cols-[19rem_1fr]">
      <aside className="hidden lg:block">
        <div className="surface sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-2xl p-5">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-display text-2xl text-ivory">Filters</h2>
            <Button variant="ghost" size="sm" onClick={() => setFilters({ ...DEFAULTS })}><RotateCcw /> Reset</Button>
          </div>
          <FilterPanel filters={filters} set={set} brands={brands} />
        </div>
      </aside>

      <div>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-mist" aria-live="polite">
            {loading && !results ? "Searching…" : (
              <>
                <span className="text-ivory">{total}</span> fragrance{total === 1 ? "" : "s"} between {formatPrice(filters.minPrice)} and {formatPrice(filters.maxPrice)}
                {filters.strict ? "" : " (flexible)"}
              </>
            )}
          </p>
          <div className="flex items-center gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary" size="sm" className="lg:hidden">
                  <SlidersHorizontal /> Filters{activeCount ? ` (${activeCount})` : ""}
                </Button>
              </DialogTrigger>
              <DialogContent title="Filters" side="right" className="overflow-y-auto">
                <FilterPanel filters={filters} set={set} brands={brands} />
              </DialogContent>
            </Dialog>
            <Select value={filters.sort} onChange={(e) => set({ sort: e.target.value as BudgetSort })} aria-label="Sort results" className="h-9 w-48 text-xs">
              <option value="score">Best match for you</option>
              <option value="value">Best value (match ÷ price)</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
            </Select>
          </div>
        </div>

        {error ? (
          <ErrorState message={error} onRetry={query.retry} />
        ) : !results ? (
          <FragranceGrid className="xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <FragranceCardSkeleton key={i} />)}
          </FragranceGrid>
        ) : results.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="Nothing in that range yet"
            description="Try widening your price range, removing a size or brand filter, or turning off the strict maximum."
            action={<Button variant="secondary" onClick={() => setFilters({ ...DEFAULTS, maxPrice: 300 })}>Widen to $300</Button>}
          />
        ) : (
          <FragranceGrid className={`xl:grid-cols-3 transition-opacity ${loading ? "opacity-60" : ""}`}>
            {results.map((r) => (
              <FragranceCard
                key={r.fragrance.id}
                fragrance={r.fragrance}
                matchPercent={profile ? r.matchPercent : null}
                reason={r.reasons[0]}
                footer={
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-mist">Best size in range</span>
                    <span className="text-ivory">
                      {r.variant.sizeMl} ml · {formatPrice(r.variant.price)}
                      {!filters.strict && r.variant.price > filters.maxPrice && <span className="ml-1 text-danger">(over)</span>}
                    </span>
                  </div>
                }
              />
            ))}
          </FragranceGrid>
        )}
        <p className="mt-8 text-xs text-dim">
          Prices are synthetic demonstration list prices in CAD. Retailer-specific prices, discounts and availability will appear here once
          licensed retail data is connected.
        </p>
      </div>
    </div>
  );
}
