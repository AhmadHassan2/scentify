"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GitCompareArrows, Heart, LibraryBig, Trash2 } from "lucide-react";
import type { FragranceSummary } from "@/types/fragrance";
import { useApp, MAX_COMPARE } from "@/components/providers/app-provider";
import { FragranceCard, FragranceGrid } from "@/components/fragrance/fragrance-card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/primitives";
import { EmptyState } from "@/components/ui/states";
import { useMatchScores } from "@/hooks/use-match-scores";
import { formatPrice } from "@/lib/fragrance/taxonomy";

type Sort = "added" | "match" | "price_asc" | "price_desc";

export function WishlistView({ all }: { all: FragranceSummary[] }) {
  const router = useRouter();
  const { wishlist, toggleWishlist, updateCollection, ready } = useApp();
  const byId = React.useMemo(() => new Map(all.map((f) => [f.id, f])), [all]);
  const items = wishlist.map((w) => ({ w, f: byId.get(w.fragranceId) })).filter((x): x is { w: typeof x.w; f: FragranceSummary } => !!x.f);
  const { scores, hasProfile } = useMatchScores(items.map((i) => i.f.id));
  const [sort, setSort] = React.useState<Sort>("added");
  const [selected, setSelected] = React.useState<string[]>([]);

  const sorted = [...items].sort((a, b) => {
    if (sort === "match") return (scores[b.f.id]?.matchPercent ?? 0) - (scores[a.f.id]?.matchPercent ?? 0);
    if (sort === "price_asc") return a.f.priceFrom - b.f.priceFrom;
    if (sort === "price_desc") return b.f.priceFrom - a.f.priceFrom;
    return b.w.addedAt.localeCompare(a.w.addedAt);
  });
  const total = items.reduce((s, i) => s + i.f.priceFrom, 0);

  if (!ready) return <div className="skeleton h-64 rounded-2xl" />;

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Heart}
        title="Your wishlist is empty"
        description="Tap the heart on any fragrance to save it here. You'll see your match score and can compare saved picks."
        action={
          <>
            <Button asChild><Link href="/recommendations">See my matches</Link></Button>
            <Button asChild variant="secondary"><Link href="/discover">Explore</Link></Button>
          </>
        }
      />
    );
  }

  const toggleSelect = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= MAX_COMPARE ? s : [...s, id]));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-mist">
          {items.length} saved · from {formatPrice(total)} total <span className="text-dim">(demo prices)</span>
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={selected.length < 2}
            onClick={() => router.push(`/compare?ids=${selected.join(",")}`)}
          >
            <GitCompareArrows /> Compare selected ({selected.length})
          </Button>
          <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort wishlist" className="h-9 w-44 text-xs">
            <option value="added">Recently added</option>
            {hasProfile && <option value="match">Best match</option>}
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </Select>
        </div>
      </div>
      <FragranceGrid>
        {sorted.map(({ w, f }) => (
          <FragranceCard
            key={f.id}
            fragrance={f}
            matchPercent={scores[f.id]?.matchPercent ?? null}
            reason={scores[f.id]?.reasons[0]}
            footer={
              <div className="space-y-3">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-mist">
                  <input
                    type="checkbox"
                    className="accent-champagne"
                    checked={selected.includes(f.id)}
                    onChange={() => toggleSelect(f.id)}
                    disabled={!selected.includes(f.id) && selected.length >= MAX_COMPARE}
                  />
                  Select to compare
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => void updateCollection(f.id, "upsert", {}, f.name)}>
                    <LibraryBig /> I own this
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void toggleWishlist(f.id, f.name)} aria-label={`Remove ${f.name} from wishlist`}>
                    <Trash2 /> Remove
                  </Button>
                </div>
                <p className="text-[0.68rem] text-dim">Saved {new Date(w.addedAt).toLocaleDateString("en-CA")} · price alerts coming with retailer data</p>
              </div>
            }
          />
        ))}
      </FragranceGrid>
    </div>
  );
}
