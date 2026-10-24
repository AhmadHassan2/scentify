"use client";

import * as React from "react";
import Link from "next/link";
import { Info, PencilLine, Sparkles } from "lucide-react";
import type { RecommendationsResponseDTO } from "@/types/dto";
import { useApp } from "@/components/providers/app-provider";
import { FragranceCardSkeleton, FragranceGrid } from "@/components/fragrance/fragrance-card";
import { MATCH_EXPLAINER } from "@/components/fragrance/match-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { apiPost } from "@/lib/client/api";
import { useApiQuery } from "@/hooks/use-api-query";
import { noteName } from "@/lib/fragrance/notes";
import { ProfileSummary } from "./profile-summary";
import { RecommendationCard } from "./recommendation-card";

export function ResultsView() {
  const { ready, profile, feedback, user, personalization, collectionIds } = useApp();
  const [excludeOwned, setExcludeOwned] = React.useState(true);
  const body = { ...personalization, limit: 24, excludeOwned, diversify: true, source: "quiz" as const };
  // Re-rank whenever the profile, feedback or collection changes.
  const key = ready && profile ? JSON.stringify({ body, fb: feedback.length, col: collectionIds.size }) : null;
  const { data, error, loading, retry } = useApiQuery<RecommendationsResponseDTO>(key, (signal) =>
    apiPost("/api/recommendations", body, { signal }),
  );

  if (!ready) return <ResultsSkeleton />;

  if (!profile) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Let's build your profile first"
        description="Answer nine quick questions and we'll rank every fragrance in the catalog for you."
        action={
          <Button asChild size="lg">
            <Link href="/quiz">Take the quiz</Link>
          </Button>
        }
      />
    );
  }

  const excluded = data?.excludedSummary;
  const noteExclusions = excluded ? Object.entries(excluded.excludedNotes) : [];

  return (
    <div className="space-y-10">
      <Card className="p-6 sm:p-7">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow mb-1.5">Your fragrance profile</p>
            <p className="text-sm text-mist">{user ? "Saved to your account." : "Saved on this device. Sign in to keep it everywhere."}</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="secondary" size="sm">
              <Link href="/quiz"><PencilLine /> Edit answers</Link>
            </Button>
            {!user && (
              <Button asChild size="sm">
                <Link href="/register?next=/recommendations">Save to account</Link>
              </Button>
            )}
          </div>
        </div>
        <ProfileSummary profile={profile} />
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2 text-xs leading-relaxed text-dim">
          <Info className="mt-0.5 size-3.5 shrink-0" /> {MATCH_EXPLAINER}
        </p>
        {user && collectionIds.size > 0 && (
          <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs text-mist">
            <input type="checkbox" checked={excludeOwned} onChange={(e) => setExcludeOwned(e.target.checked)} className="accent-champagne" />
            Hide fragrances I own
          </label>
        )}
      </div>

      {error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : !data ? (
        <ResultsSkeleton />
      ) : data.results.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Nothing fits every rule"
          description={
            excluded?.overBudget
              ? `${excluded.overBudget} fragrances are above your strict maximum. Raise your budget or make it flexible.`
              : "Your exclusions rule out the whole catalog. Try loosening them."
          }
          action={
            <Button asChild variant="secondary">
              <Link href="/quiz">Adjust answers</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div>
            <h2 className="mb-1 text-3xl text-ivory">Your top matches</h2>
            <p className="mb-6 text-sm text-mist">
              Ranked from {data.totalEligible} eligible fragrances
              {excluded && (excluded.overBudget || noteExclusions.length || excluded.hidden || excluded.owned) ? (
                <>
                  {" · "}
                  hidden:{" "}
                  {[
                    excluded.overBudget ? `${excluded.overBudget} over budget` : null,
                    ...noteExclusions.map(([n, c]) => `${c} with ${noteName(n).toLowerCase()}`),
                    excluded.hidden ? `${excluded.hidden} not interested` : null,
                    excluded.owned ? `${excluded.owned} owned` : null,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </>
              ) : null}
            </p>
            <FragranceGrid className={`lg:grid-cols-3 xl:grid-cols-3 transition-opacity ${loading ? "opacity-60" : ""}`}>
              {data.results.slice(0, 3).map((r, i) => (
                <RecommendationCard key={r.fragrance.id} rec={r} rank={i} />
              ))}
            </FragranceGrid>
          </div>
          {data.results.length > 3 && (
            <div>
              <h2 className="mb-6 text-2xl text-ivory">More to explore</h2>
              <FragranceGrid>
                {data.results.slice(3).map((r) => (
                  <RecommendationCard key={r.fragrance.id} rec={r} />
                ))}
              </FragranceGrid>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <FragranceGrid>
      {Array.from({ length: 8 }).map((_, i) => (
        <FragranceCardSkeleton key={i} />
      ))}
    </FragranceGrid>
  );
}
