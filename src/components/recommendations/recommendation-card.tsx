"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import type { RecommendationDTO } from "@/types/dto";
import { FeedbackControls } from "@/components/fragrance/feedback-controls";
import { FragranceCard } from "@/components/fragrance/fragrance-card";
import { cn } from "@/lib/utils";
import { ScoreBreakdown } from "./score-breakdown";

export function RecommendationCard({ rec, rank }: { rec: RecommendationDTO; rank?: number }) {
  const [open, setOpen] = React.useState(false);
  const id = React.useId();
  return (
    <div className="relative">
      {rank !== undefined && rank < 3 && (
        <span className="absolute -left-2 -top-2 z-10 grid size-8 place-items-center rounded-full bg-ivory font-display text-base text-ink">
          {rank + 1}
        </span>
      )}
      <FragranceCard
        fragrance={rec.fragrance}
        matchPercent={rec.matchPercent}
        className="h-full"
        footer={
          <div className="space-y-3">
            <ul className="space-y-1.5">
              {rec.reasons.slice(0, 3).map((r) => (
                <li key={r} className="flex gap-2 text-[0.78rem] leading-snug text-parchment/90">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-ivory" aria-hidden />
                  {r}
                </li>
              ))}
              {rec.cautions.slice(0, 1).map((c) => (
                <li key={c} className="flex gap-2 text-[0.78rem] leading-snug text-mist">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-danger/70" aria-hidden />
                  {c}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-controls={id}
              className="inline-flex cursor-pointer items-center gap-1 text-[0.72rem] text-dim hover:text-ivory"
            >
              Score breakdown <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
            </button>
            {open && (
              <div id={id} className="space-y-2">
                <ScoreBreakdown components={rec.components} />
                {rec.cautions.slice(1).map((c) => (
                  <p key={c} className="text-[0.72rem] text-mist">· {c}</p>
                ))}
              </div>
            )}
            <FeedbackControls fragranceId={rec.fragrance.id} name={rec.fragrance.name} compact />
          </div>
        }
      />
    </div>
  );
}
