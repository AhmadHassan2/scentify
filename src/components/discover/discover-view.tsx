"use client";

import * as React from "react";
import Link from "next/link";
import { Compass, Sparkles } from "lucide-react";
import type { DiscoverySectionDTO } from "@/types/dto";
import { useApp } from "@/components/providers/app-provider";
import { FragranceCard, FragranceCardSkeleton } from "@/components/fragrance/fragrance-card";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { apiPost } from "@/lib/client/api";
import { useApiQuery } from "@/hooks/use-api-query";

function Shelf({ section, personalized }: { section: DiscoverySectionDTO; personalized: boolean }) {
  return (
    <section aria-labelledby={`shelf-${section.id}`}>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 id={`shelf-${section.id}`} className="text-3xl text-ivory">{section.title}</h2>
          <p className="mt-1 text-sm text-mist">{section.description}</p>
        </div>
      </div>
      {section.items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-ivory/12 px-5 py-8 text-center text-sm text-mist">
          {section.emptyHint ?? "Nothing to show here yet."}
        </p>
      ) : (
        <div className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          {section.items.map((item) => (
            <div key={item.fragrance.id} className="w-[78vw] max-w-[19rem] shrink-0 snap-start sm:w-72">
              <FragranceCard
                fragrance={item.fragrance}
                matchPercent={personalized ? item.matchPercent : null}
                reason={item.reason}
                className="h-full"
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function DiscoverView() {
  const { ready, personalization, profile, feedback, collection } = useApp();
  const key = ready ? JSON.stringify({ personalization, profile, fb: feedback.length, col: collection.length }) : null;
  const { data, error, retry } = useApiQuery<{ sections: DiscoverySectionDTO[]; personalized: boolean }>(key, (signal) =>
    apiPost("/api/discover", personalization, { signal }),
  );

  if (error) return <ErrorState message={error} onRetry={retry} />;

  if (!data) {
    return (
      <div className="space-y-14">
        {[0, 1].map((s) => (
          <div key={s}>
            <div className="skeleton mb-5 h-8 w-56 rounded" />
            <div className="flex gap-4 overflow-hidden">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="w-72 shrink-0"><FragranceCardSkeleton /></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (data.sections.every((s) => s.items.length === 0)) {
    return <EmptyState icon={Compass} title="Your filters rule out everything" description="Your exclusions leave nothing to discover. Loosen them in your profile." />;
  }

  return (
    <div className="space-y-16">
      {!data.personalized && (
        <div className="surface flex flex-col items-start gap-4 rounded-2xl p-5 sm:flex-row sm:items-center">
          <Sparkles className="size-5 shrink-0 text-champagne" />
          <p className="flex-1 text-sm text-mist">
            These shelves are tuned to general quality and variety. Take the quiz and they&apos;ll balance novelty against <em>your</em> taste.
          </p>
          <Button asChild size="sm"><Link href="/quiz">Take the quiz</Link></Button>
        </div>
      )}
      {data.sections.map((s) => (
        <Shelf key={s.id} section={s} personalized={data.personalized} />
      ))}
    </div>
  );
}
