import type { ScoreBreakdownDTO } from "@/types/dto";
import { DEFAULT_WEIGHTS } from "@/lib/recommendation/config";

const LABELS: Record<keyof ScoreBreakdownDTO, string> = {
  scent: "Scent",
  occasion: "Occasion",
  budget: "Budget",
  season: "Season",
  strength: "Strength",
};

export function ScoreBreakdown({ components }: { components: ScoreBreakdownDTO }) {
  return (
    <dl className="space-y-2">
      {(Object.keys(LABELS) as Array<keyof ScoreBreakdownDTO>).map((k) => (
        <div key={k} className="grid grid-cols-[4.5rem_1fr_2.5rem] items-center gap-3 text-xs">
          <dt className="text-mist">
            {LABELS[k]} <span className="text-dim">{Math.round(DEFAULT_WEIGHTS[k] * 100)}%</span>
          </dt>
          <dd className="h-1.5 overflow-hidden rounded-full bg-ivory/[0.07]">
            <div className="h-full rounded-full bg-ivory" style={{ width: `${Math.round(components[k] * 100)}%` }} />
          </dd>
          <dd className="text-right tabular-nums text-parchment">{Math.round(components[k] * 100)}</dd>
        </div>
      ))}
    </dl>
  );
}
