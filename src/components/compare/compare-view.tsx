"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GitCompareArrows, Plus, Search, X } from "lucide-react";
import type { Fragrance, FragranceSummary, Occasion, Season } from "@/types/fragrance";
import { useApp, MAX_COMPARE } from "@/components/providers/app-provider";
import { Bottle } from "@/components/fragrance/bottle";
import { MatchBadge } from "@/components/fragrance/match-badge";
import { Button } from "@/components/ui/button";
import { Input, Meter } from "@/components/ui/primitives";
import { EmptyState } from "@/components/ui/states";
import { useMatchScores } from "@/hooks/use-match-scores";
import { noteName } from "@/lib/fragrance/notes";
import { CONCENTRATION_META, FAMILY_META, OCCASION_META, SEASON_META, formatPrice } from "@/lib/fragrance/taxonomy";
import { cn } from "@/lib/utils";

function Picker({ all, exclude, onPick }: { all: FragranceSummary[]; exclude: string[]; onPick: (id: string) => void }) {
  const [q, setQ] = React.useState("");
  const matches = q.trim().length >= 2
    ? all.filter((f) => !exclude.includes(f.id) && `${f.name} ${f.brand}`.toLowerCase().includes(q.toLowerCase())).slice(0, 6)
    : [];
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-dim" />
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Add a fragrance to compare…" aria-label="Search fragrances to compare" className="pl-11" />
      {matches.length > 0 && (
        <ul className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-ivory/10 bg-graphite shadow-[0_8px_24px_-12px_rgb(27_25_22/0.25)]">
          {matches.map((f) => (
            <li key={f.id}>
              <button
                onClick={() => { onPick(f.id); setQ(""); }}
                className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-ivory/5"
              >
                <span><span className="text-ivory">{f.name}</span> <span className="text-dim">· {f.brand}</span></span>
                <Plus className="size-4 text-champagne" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Row({ label, children, cols }: { label: string; children: React.ReactNode; cols: number }) {
  return (
    <div className="grid gap-4 border-t border-ivory/[0.07] py-5" style={{ gridTemplateColumns: `minmax(6.5rem,9rem) repeat(${cols}, minmax(10rem,1fr))` }}>
      <div className="text-xs font-medium uppercase tracking-[0.12em] text-dim">{label}</div>
      {children}
    </div>
  );
}

function best(values: number[], higher = true) {
  const target = higher ? Math.max(...values) : Math.min(...values);
  return values.map((v) => v === target && values.filter((x) => x === target).length < values.length);
}

export function CompareView({ fragrances, all }: { fragrances: Fragrance[]; all: FragranceSummary[] }) {
  const router = useRouter();
  const { compareIds, setCompare, clearCompare } = useApp();
  const ids = fragrances.map((f) => f.id);
  const { scores, hasProfile } = useMatchScores(ids);

  // Keep the floating tray in sync with what's on screen.
  React.useEffect(() => {
    const key = ids.join(",");
    if (key && key !== compareIds.join(",")) setCompare(ids);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(",")]);

  const setIds = (next: string[]) => {
    router.replace(next.length ? `/compare?ids=${next.join(",")}` : "/compare", { scroll: false });
    if (!next.length) clearCompare();
  };

  if (fragrances.length === 0) {
    return (
      <div className="space-y-6">
        <Picker all={all} exclude={[]} onPick={(id) => setIds([id])} />
        <EmptyState
          icon={GitCompareArrows}
          title="Pick fragrances to compare"
          description="Search above, or tap the compare icon on any fragrance card. You can compare up to three side by side."
          action={<Button asChild variant="secondary"><Link href="/fragrances">Browse fragrances</Link></Button>}
        />
      </div>
    );
  }

  const cols = fragrances.length;
  const prices = fragrances.map((f) => Math.min(...f.variants.map((v) => v.price)));
  const allNotes = fragrances.map((f) => new Set([...f.notes.top, ...f.notes.middle, ...f.notes.base]));
  const shared = new Set([...allNotes[0]].filter((n) => allNotes.every((s) => s.has(n))));

  return (
    <div className="space-y-6">
      {cols < MAX_COMPARE && <Picker all={all} exclude={ids} onPick={(id) => setIds([...ids, id])} />}
      {cols === 1 && <p className="text-sm text-mist">Add at least one more fragrance to see them side by side.</p>}

      <div className="scrollbar-none -mx-4 overflow-x-auto px-4">
        <div className="min-w-[38rem]">
          <div className="grid gap-4 pb-5" style={{ gridTemplateColumns: `minmax(6.5rem,9rem) repeat(${cols}, minmax(10rem,1fr))` }}>
            <div />
            {fragrances.map((f) => (
              <div key={f.id} className="surface relative rounded-2xl p-4 text-center">
                <button onClick={() => setIds(ids.filter((x) => x !== f.id))} aria-label={`Remove ${f.name}`} className="absolute right-2 top-2 rounded-full p-1.5 text-dim hover:bg-ivory/5 hover:text-ivory">
                  <X className="size-4" />
                </button>
                <div className="mx-auto h-36 w-28"><Bottle visual={f.visual} brand={f.brand} name={f.name} /></div>
                <p className="mt-3 text-[0.65rem] uppercase tracking-[0.16em] text-dim">{f.brand}</p>
                <Link href={`/fragrance/${f.slug}`} className="font-display text-xl text-ivory hover:text-champagne-soft">{f.name}</Link>
                <p className="mt-1 text-xs text-mist">{CONCENTRATION_META[f.concentration].label}</p>
              </div>
            ))}
          </div>

          <Row label="Your match" cols={cols}>
            {fragrances.map((f) => (
              <div key={f.id}>
                {hasProfile && scores[f.id] ? <MatchBadge value={scores[f.id].matchPercent} /> : <Link href="/quiz" className="text-xs text-champagne hover:underline">Take the quiz</Link>}
              </div>
            ))}
          </Row>
          <Row label="Price from" cols={cols}>
            {fragrances.map((f, i) => (
              <div key={f.id}>
                <p className={cn("text-lg", best(prices, false)[i] ? "text-champagne-soft" : "text-ivory")}>
                  {formatPrice(prices[i])}
                  {best(prices, false)[i] && <span className="ml-2 text-[0.65rem] uppercase tracking-wider text-champagne">Lowest</span>}
                </p>
                <p className="text-xs text-dim">{f.variants.map((v) => `${v.sizeMl} ml`).join(" · ")} · demo</p>
              </div>
            ))}
          </Row>
          <Row label="Families" cols={cols}>
            {fragrances.map((f) => <p key={f.id} className="text-sm text-parchment">{f.families.map((x) => FAMILY_META[x].label).join(", ")}</p>)}
          </Row>
          <Row label="Main accords" cols={cols}>
            {fragrances.map((f) => (
              <div key={f.id} className="flex flex-wrap gap-1.5">
                {f.accords.slice(0, 4).map((a) => <span key={a.id} className="rounded-full bg-ivory/[0.06] px-2.5 py-0.5 text-xs text-parchment">{a.label}</span>)}
              </div>
            ))}
          </Row>
          {(["top", "middle", "base"] as const).map((tier) => (
            <Row key={tier} label={tier === "middle" ? "Heart notes" : `${tier[0].toUpperCase()}${tier.slice(1)} notes`} cols={cols}>
              {fragrances.map((f) => (
                <p key={f.id} className="text-sm leading-relaxed text-mist">
                  {f.notes[tier].map((n, i) => (
                    <React.Fragment key={n}>
                      {i > 0 && ", "}
                      <span className={shared.has(n) && cols > 1 ? "text-champagne-soft" : undefined}>{noteName(n)}</span>
                    </React.Fragment>
                  ))}
                </p>
              ))}
            </Row>
          ))}
          {(["longevity", "projection", "versatility"] as const).map((k) => {
            const winners = best(fragrances.map((f) => f[k]));
            return (
              <Row key={k} label={k[0].toUpperCase() + k.slice(1)} cols={cols}>
                {fragrances.map((f, i) => (
                  <div key={f.id}>
                    <p className={cn("mb-1.5 text-sm", winners[i] ? "text-champagne-soft" : "text-parchment")}>{f[k]}/10</p>
                    <Meter value={f[k]} label={`${k} of ${f.name}`} />
                  </div>
                ))}
              </Row>
            );
          })}
          <Row label="Seasons" cols={cols}>
            {fragrances.map((f) => (
              <div key={f.id} className="space-y-1.5">
                {(Object.keys(SEASON_META) as Season[]).map((s) => (
                  <div key={s} className="grid grid-cols-[4rem_1fr] items-center gap-2 text-xs text-mist">
                    {SEASON_META[s].label}
                    <Meter value={f.seasons[s]} max={1} label={`${SEASON_META[s].label} suitability`} />
                  </div>
                ))}
              </div>
            ))}
          </Row>
          <Row label="Occasions" cols={cols}>
            {fragrances.map((f) => (
              <div key={f.id} className="space-y-1.5">
                {(Object.keys(OCCASION_META) as Occasion[]).map((o) => (
                  <div key={o} className="grid grid-cols-[5.5rem_1fr] items-center gap-2 text-xs text-mist">
                    {OCCASION_META[o].label}
                    <Meter value={f.occasions[o]} max={1} label={`${OCCASION_META[o].label} suitability`} />
                  </div>
                ))}
              </div>
            ))}
          </Row>
        </div>
      </div>
      {cols > 1 && shared.size > 0 && (
        <p className="text-xs text-dim"><span className="text-champagne-soft">Highlighted notes</span> appear in every fragrance compared.</p>
      )}
    </div>
  );
}
