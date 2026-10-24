"use client";

import * as React from "react";
import Link from "next/link";
import { CloudSun, LibraryBig, Search, Star, Trash2 } from "lucide-react";
import type { FragranceFamily, FragranceSummary, Season } from "@/types/fragrance";
import type { CollectionItem } from "@/types/preferences";
import { SEASONS } from "@/types/fragrance";
import { useApp } from "@/components/providers/app-provider";
import { Bottle } from "@/components/fragrance/bottle";
import { Button } from "@/components/ui/button";
import { Card, Chip, Input, Select, Textarea } from "@/components/ui/primitives";
import { EmptyState } from "@/components/ui/states";
import { FAMILY_META, SEASON_META, formatPrice } from "@/lib/fragrance/taxonomy";
import { noteName } from "@/lib/fragrance/notes";
import { cn } from "@/lib/utils";

function Stars({ value, onChange, name }: { value: number | null; onChange: (v: number | null) => void; name: string }) {
  return (
    <div role="radiogroup" aria-label={`Your rating for ${name}`} className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((v) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          aria-label={`${v} star${v > 1 ? "s" : ""}`}
          onClick={() => onChange(value === v ? null : v)}
          className="cursor-pointer p-0.5"
        >
          <Star className={cn("size-4", value && v <= value ? "fill-champagne text-champagne" : "text-ash hover:text-mist")} />
        </button>
      ))}
    </div>
  );
}

function CollectionRow({ item, f }: { item: CollectionItem; f: FragranceSummary }) {
  const { updateCollection } = useApp();
  const [notes, setNotes] = React.useState(item.personalNotes ?? "");

  return (
    <Card className="grid gap-5 p-4 sm:grid-cols-[6rem_1fr_auto] sm:p-5">
      <Link href={`/fragrance/${f.slug}`} className="mx-auto h-28 w-20 sm:mx-0" aria-label={`${f.name} details`}>
        <Bottle visual={f.visual} brand={f.brand} name={f.name} />
      </Link>
      <div className="min-w-0">
        <p className="text-[0.65rem] uppercase tracking-[0.16em] text-dim">{f.brand} · {f.concentration}</p>
        <Link href={`/fragrance/${f.slug}`} className="font-display text-2xl text-ivory hover:text-champagne-soft">{f.name}</Link>
        <p className="mt-0.5 text-xs text-mist">{FAMILY_META[f.families[0]].label} · {f.topNotes.slice(0, 3).map(noteName).join(", ")}</p>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <Stars value={item.rating} name={f.name} onChange={(rating) => void updateCollection(f.id, "upsert", { rating })} />
          <button
            type="button"
            aria-pressed={item.isFavorite}
            onClick={() => void updateCollection(f.id, "upsert", { isFavorite: !item.isFavorite })}
            className={cn("cursor-pointer rounded-full border px-3 py-1 text-xs transition-colors", item.isFavorite ? "border-champagne/50 bg-champagne/12 text-champagne-soft" : "border-ivory/10 text-mist hover:text-ivory")}
          >
            {item.isFavorite ? "★ Favourite" : "Mark favourite"}
          </button>
        </div>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => notes !== (item.personalNotes ?? "") && void updateCollection(f.id, "upsert", { personalNotes: notes || null })}
          placeholder="Personal notes: how it wears on you, compliments, when you reach for it…"
          aria-label={`Personal notes for ${f.name}`}
          maxLength={2000}
          className="mt-3 min-h-16 text-xs"
        />
      </div>
      <div className="flex items-start justify-end">
        <Button variant="ghost" size="icon-sm" aria-label={`Remove ${f.name} from collection`} onClick={() => void updateCollection(f.id, "remove", undefined, f.name)}>
          <Trash2 />
        </Button>
      </div>
    </Card>
  );
}

export function CollectionView({ all }: { all: FragranceSummary[] }) {
  const { collection, ready } = useApp();
  const byId = React.useMemo(() => new Map(all.map((f) => [f.id, f])), [all]);
  const items = collection.map((item) => ({ item, f: byId.get(item.fragranceId) })).filter((x): x is { item: CollectionItem; f: FragranceSummary } => !!x.f);
  const [q, setQ] = React.useState("");
  const [family, setFamily] = React.useState<FragranceFamily | "all">("all");
  const [favOnly, setFavOnly] = React.useState(false);
  const [sort, setSort] = React.useState<"added" | "rating" | "name">("added");

  if (!ready) return <div className="skeleton h-64 rounded-2xl" />;

  if (items.length === 0) {
    return (
      <EmptyState
        icon={LibraryBig}
        title="Start your collection"
        description="Add the fragrances you own. We'll use them for daily weather picks, smarter recommendations and your Fragrance DNA."
        action={<Button asChild><Link href="/fragrances">Find fragrances you own</Link></Button>}
      />
    );
  }

  const families = [...new Set(items.map((i) => i.f.families[0]))];
  const familyCounts = families.map((fam) => ({ fam, n: items.filter((i) => i.f.families[0] === fam).length })).sort((a, b) => b.n - a.n);
  const coverage = (s: Season) => items.filter((i) => i.f.seasons[s] >= 0.6).length;
  const rated = items.filter((i) => i.item.rating);
  const avgRating = rated.length ? rated.reduce((s, i) => s + (i.item.rating ?? 0), 0) / rated.length : null;

  const filtered = items
    .filter((i) => (family === "all" || i.f.families.includes(family)) && (!favOnly || i.item.isFavorite))
    .filter((i) => !q || `${i.f.name} ${i.f.brand}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) =>
      sort === "rating" ? (b.item.rating ?? 0) - (a.item.rating ?? 0) : sort === "name" ? a.f.name.localeCompare(b.f.name) : b.item.addedAt.localeCompare(a.item.addedAt),
    );

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <div>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-dim" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your collection" aria-label="Search collection" className="pl-11" />
          </div>
          <Select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sort collection" className="sm:w-44">
            <option value="added">Recently added</option>
            <option value="rating">Your rating</option>
            <option value="name">Name</option>
          </Select>
        </div>
        <div className="scrollbar-none mb-6 flex gap-2 overflow-x-auto">
          <Chip selected={favOnly} onClick={() => setFavOnly((v) => !v)} className="shrink-0">★ Favourites</Chip>
          <Chip selected={family === "all"} onClick={() => setFamily("all")} className="shrink-0">All families</Chip>
          {families.map((fam) => (
            <Chip key={fam} selected={family === fam} onClick={() => setFamily(fam)} className="shrink-0">{FAMILY_META[fam].label}</Chip>
          ))}
        </div>
        <div className="space-y-4">
          {filtered.length ? filtered.map(({ item, f }) => <CollectionRow key={f.id} item={item} f={f} />) : (
            <p className="py-10 text-center text-sm text-mist">No fragrances match these filters.</p>
          )}
        </div>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <Card className="p-5">
          <p className="eyebrow mb-4">Collection stats</p>
          <dl className="grid grid-cols-2 gap-4">
            <div><dt className="text-xs text-dim">Bottles</dt><dd className="font-display text-3xl text-ivory">{items.length}</dd></div>
            <div><dt className="text-xs text-dim">Favourites</dt><dd className="font-display text-3xl text-ivory">{items.filter((i) => i.item.isFavorite).length}</dd></div>
            <div><dt className="text-xs text-dim">Avg. rating</dt><dd className="font-display text-3xl text-ivory">{avgRating ? avgRating.toFixed(1) : "—"}</dd></div>
            <div><dt className="text-xs text-dim">Shelf value*</dt><dd className="font-display text-3xl text-ivory">{formatPrice(items.reduce((s, i) => s + i.f.priceFrom, 0))}</dd></div>
          </dl>
          <div className="mt-5 border-t border-ivory/[0.07] pt-4">
            <p className="mb-2 text-xs text-dim">Families</p>
            <div className="flex h-2.5 overflow-hidden rounded-full">
              {familyCounts.map(({ fam, n }) => (
                <div key={fam} title={`${FAMILY_META[fam].label}: ${n}`} style={{ width: `${(n / items.length) * 100}%`, background: FAMILY_META[fam].tone }} />
              ))}
            </div>
            <ul className="mt-2 space-y-1 text-xs text-mist">
              {familyCounts.slice(0, 4).map(({ fam, n }) => <li key={fam}>{FAMILY_META[fam].label} · {n}</li>)}
            </ul>
          </div>
          <div className="mt-4 border-t border-ivory/[0.07] pt-4">
            <p className="mb-2 text-xs text-dim">Season coverage</p>
            <div className="grid grid-cols-4 gap-2 text-center">
              {SEASONS.map((s) => (
                <div key={s} className={cn("rounded-lg py-2 text-xs", coverage(s) ? "bg-champagne/10 text-champagne-soft" : "bg-ivory/[0.03] text-dim")}>
                  <div className="font-display text-lg">{coverage(s)}</div>
                  {SEASON_META[s].label}
                </div>
              ))}
            </div>
            {SEASONS.some((s) => !coverage(s)) && (
              <p className="mt-2 text-xs text-mist">Gap: nothing strong for {SEASONS.filter((s) => !coverage(s)).map((s) => SEASON_META[s].label.toLowerCase()).join(", ")}.</p>
            )}
          </div>
          <p className="mt-4 text-[0.65rem] text-dim">*Sum of demo list prices for the smallest size.</p>
        </Card>
        <Button asChild className="w-full"><Link href="/today"><CloudSun /> What should I wear today?</Link></Button>
        <Button asChild variant="secondary" className="w-full"><Link href="/discover">Find something new</Link></Button>
      </aside>
    </div>
  );
}
