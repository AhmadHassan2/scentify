"use client";

import { Info } from "lucide-react";
import { Tooltip } from "@/components/ui/overlays";
import { cn } from "@/lib/utils";

export const MATCH_EXPLAINER =
  "An algorithmic compatibility score from your stated preferences and feedback — not a prediction or probability that you'll love it.";

export function MatchBadge({ value, className, size = "sm" }: { value: number; className?: string; size?: "sm" | "lg" }) {
  return (
    <Tooltip content={MATCH_EXPLAINER}>
      <span
        tabIndex={0}
        className={cn(
          "inline-flex cursor-help items-center gap-1 rounded-[3px] bg-graphite font-medium text-ivory ring-1 ring-ivory/15",
          size === "lg" ? "px-3 py-1 text-sm" : "px-2.5 py-1 text-[0.7rem]",
          className,
        )}
      >
        {value}% match
        <Info className="size-3 opacity-60" aria-hidden />
        <span className="sr-only">. {MATCH_EXPLAINER}</span>
      </span>
    </Tooltip>
  );
}

/** Circular score display for detail views. */
export function MatchRing({ value, label = "Match" }: { value: number; label?: string }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <Tooltip content={MATCH_EXPLAINER}>
      <div tabIndex={0} className="relative size-24 cursor-help" role="img" aria-label={`${value}% compatibility. ${MATCH_EXPLAINER}`}>
        <svg viewBox="0 0 80 80" className="size-full -rotate-90">
          <circle cx="40" cy="40" r={r} fill="none" stroke="rgb(27 25 22 / 0.1)" strokeWidth="5" />
          <circle
            cx="40"
            cy="40"
            r={r}
            fill="none"
            stroke="url(#ringGold)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - value / 100)}
            className="transition-[stroke-dashoffset] duration-1000 ease-out"
          />
          <defs>
            <linearGradient id="ringGold" x1="0" x2="1">
              <stop offset="0" stopColor="#1b1916" />
              <stop offset="1" stopColor="#1b1916" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl leading-none text-ivory">{value}%</span>
          <span className="mt-0.5 text-[0.6rem] uppercase tracking-[0.18em] text-mist">{label}</span>
        </div>
      </div>
    </Tooltip>
  );
}
