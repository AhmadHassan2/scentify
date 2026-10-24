"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useMatchScores } from "@/hooks/use-match-scores";
import { Button } from "@/components/ui/button";
import { ScoreBreakdown } from "@/components/recommendations/score-breakdown";
import { MatchRing } from "./match-badge";

export function PersonalMatch({ fragranceId }: { fragranceId: string }) {
  const { scores, hasProfile, loading } = useMatchScores([fragranceId]);
  const s = scores[fragranceId];

  if (loading && !s) {
    return <div className="skeleton h-40 rounded-2xl" aria-label="Loading your match" />;
  }

  if (!hasProfile || !s) {
    return (
      <div className="surface flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center">
        <div className="grid size-12 shrink-0 place-items-center rounded-full border border-champagne/25 bg-champagne/[0.07]">
          <Sparkles className="size-5 text-champagne" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-ivory">See how this fits you</p>
          <p className="mt-0.5 text-xs leading-relaxed text-mist">Take the 2-minute quiz to get a personal compatibility score and reasons on every fragrance.</p>
        </div>
        <Button asChild size="sm">
          <Link href="/quiz">Take the quiz</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="surface grid gap-6 rounded-2xl p-5 sm:grid-cols-[auto_1fr] sm:p-6">
      <div className="flex items-center gap-5 sm:flex-col sm:items-center">
        <MatchRing value={s.matchPercent} />
        <p className="max-w-40 text-[0.68rem] leading-relaxed text-dim sm:text-center">Compatibility with your profile, not a guarantee.</p>
      </div>
      <div className="space-y-5">
        {s.reasons.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-dim">Why it fits</p>
            <ul className="space-y-1.5">
              {s.reasons.slice(0, 4).map((r) => (
                <li key={r} className="flex gap-2 text-sm text-parchment">
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-ivory" aria-hidden />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}
        {s.cautions.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-dim">Worth knowing</p>
            <ul className="space-y-1.5">
              {s.cautions.map((c) => (
                <li key={c} className="flex gap-2 text-sm text-mist">
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-danger/70" aria-hidden />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}
        <ScoreBreakdown components={s.components} />
      </div>
    </div>
  );
}
