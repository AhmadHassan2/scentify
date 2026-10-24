import type { Accord, Fragrance, Occasion, Season } from "@/types/fragrance";
import { NOTE_BY_ID, noteName } from "@/lib/fragrance/notes";
import { OCCASION_META, SEASON_META, performanceLabel } from "@/lib/fragrance/taxonomy";
import { Meter } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export const ACCORD_TONES: Record<string, string> = {
  citrus: "#E7C766", aquatic: "#7FB4C9", green: "#86A06B", aromatic: "#9AAE8C", floral: "#D9A3A8",
  white_floral: "#E9D7C9", fruity: "#E39A6B", fresh_spice: "#D8925E", warm_spice: "#C46F45", woody: "#A7825A",
  earthy: "#8B7355", amber: "#C98B3E", gourmand: "#B9875F", boozy: "#9B5A2E", leather: "#7A5642",
  tobacco: "#8E6B45", musk: "#C9BBAA", smoky: "#77706A", powdery: "#CDB9C4",
};

export function NotesPyramid({ notes }: { notes: Fragrance["notes"] }) {
  const tiers: Array<{ key: keyof Fragrance["notes"]; label: string; hint: string }> = [
    { key: "top", label: "Top", hint: "First 15 minutes" },
    { key: "middle", label: "Heart", hint: "The character" },
    { key: "base", label: "Base", hint: "The dry-down" },
  ];
  return (
    <div className="space-y-4">
      {tiers.map((t, i) => (
        <div key={t.key} className="grid grid-cols-[5.5rem_1fr] gap-4 sm:grid-cols-[7rem_1fr]">
          <div>
            <p className="text-sm font-medium text-ivory">{t.label}</p>
            <p className="text-[0.7rem] text-dim">{t.hint}</p>
          </div>
          <div className={cn("flex flex-wrap gap-2", i === 0 && "pl-0")}>
            {notes[t.key].map((id) => {
              const group = NOTE_BY_ID[id]?.groups[0] ?? "woody";
              return (
                <span key={id} className="inline-flex items-center gap-2 rounded-full border border-ivory/10 bg-ivory/[0.03] px-3 py-1.5 text-[0.8rem] text-parchment">
                  <span className="size-2 rounded-full" style={{ background: ACCORD_TONES[group] }} aria-hidden />
                  {noteName(id)}
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function AccordBars({ accords, max = 6 }: { accords: Accord[]; max?: number }) {
  return (
    <div className="space-y-2.5">
      {accords.slice(0, max).map((a) => (
        <div key={a.id} className="flex items-center gap-3">
          <span className="w-24 shrink-0 text-xs text-mist">{a.label}</span>
          <div className="h-6 flex-1 overflow-hidden rounded-md bg-ivory/[0.04]">
            <div
              className="flex h-full items-center rounded-md px-2 text-[0.65rem] font-medium text-ivory/80"
              style={{ width: `${Math.max(14, a.strength)}%`, background: ACCORD_TONES[a.id] ?? "#B9A892" }}
            >
              {a.strength}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PerformanceMeters({ f }: { f: Pick<Fragrance, "longevity" | "projection" | "versatility"> }) {
  const rows = [
    { label: "Longevity", value: f.longevity },
    { label: "Projection", value: f.projection },
    { label: "Versatility", value: f.versatility },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-xs text-mist">{r.label}</span>
            <span className="text-sm text-ivory">
              {r.value}
              <span className="text-dim">/10</span>
            </span>
          </div>
          <Meter value={r.value} label={r.label} />
          <p className="mt-1.5 text-[0.7rem] text-dim">{performanceLabel(r.value)}</p>
        </div>
      ))}
    </div>
  );
}

function SuitabilityBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-24 w-full max-w-10 overflow-hidden rounded-lg bg-ivory/[0.05]" role="meter" aria-label={label} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="absolute inset-x-0 bottom-0 rounded-lg bg-ivory/75 transition-[height] duration-700" style={{ height: `${pct}%` }} />
      </div>
      <span className="text-center text-[0.68rem] leading-tight text-mist">{label}</span>
    </div>
  );
}

export function SeasonChart({ seasons }: { seasons: Record<Season, number> }) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {(Object.keys(SEASON_META) as Season[]).map((s) => (
        <SuitabilityBar key={s} label={SEASON_META[s].label} value={seasons[s]} />
      ))}
    </div>
  );
}

export function OccasionChart({ occasions }: { occasions: Record<Occasion, number> }) {
  return (
    <div className="grid grid-cols-4 gap-3 sm:grid-cols-7">
      {(Object.keys(OCCASION_META) as Occasion[]).map((o) => (
        <SuitabilityBar key={o} label={OCCASION_META[o].label} value={occasions[o]} />
      ))}
    </div>
  );
}

export function DemoDataNotice({ className }: { className?: string }) {
  return (
    <p className={cn("rounded-xl border border-ivory/10 bg-ivory/[0.02] px-4 py-3 text-xs leading-relaxed text-dim", className)}>
      <span className="font-medium text-mist">Demonstration data.</span> This brand, fragrance, its notes, ratings and prices are fictional and
      generated for demonstration. They don&apos;t represent real retail products or offers.
    </p>
  );
}
