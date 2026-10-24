"use client";

import * as React from "react";
import type { SimilarDTO } from "@/types/dto";
import { useApp } from "@/components/providers/app-provider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/overlays";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { apiPost } from "@/lib/client/api";
import { useApiQuery } from "@/hooks/use-api-query";
import { SIMILAR_MODES, SIMILAR_MODE_META, type SimilarMode } from "@/lib/recommendation/similarity";
import { FragranceCard, FragranceCardSkeleton } from "./fragrance-card";
import { ScanSearch } from "lucide-react";

export function SimilarFragrances({ fragranceId, name }: { fragranceId: string; name: string }) {
  const { ready, personalization } = useApp();
  const [mode, setMode] = React.useState<SimilarMode>("similar");
  const body = { fragranceId, mode, limit: 4, ...personalization };
  const query = useApiQuery<{ results: SimilarDTO[] }>(ready ? JSON.stringify(body) : null, (signal) =>
    apiPost("/api/similar", body, { signal }),
  );
  const state = { loading: query.loading && !query.data, error: query.error, results: query.data?.results ?? [] };

  return (
    <section id="similar" className="scroll-mt-24">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow mb-3">Find similar</p>
          <h2 className="text-3xl text-ivory sm:text-4xl">If you like {name}</h2>
          <p className="mt-2 max-w-xl text-sm text-mist">
            Matched on shared notes, accords, families and performance. Similar profiles are not claims that two scents are identical.
          </p>
        </div>
        <Tabs value={mode} onValueChange={(v) => setMode(v as SimilarMode)}>
          <TabsList aria-label="Similarity mode">
            {SIMILAR_MODES.map((m) => (
              <TabsTrigger key={m} value={m}>
                {SIMILAR_MODE_META[m].label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {state.error ? (
        <ErrorState message={state.error} onRetry={query.retry} />
      ) : state.loading ? (
        <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <FragranceCardSkeleton key={i} />
          ))}
        </div>
      ) : state.results.length === 0 ? (
        <EmptyState
          icon={ScanSearch}
          title={`No ${SIMILAR_MODE_META[mode].label.toLowerCase()} options`}
          description="Nothing in the catalog is both related enough and meets this constraint. Try another mode."
        />
      ) : (
        <div className={`grid grid-cols-1 gap-4 transition-opacity min-[480px]:grid-cols-2 lg:grid-cols-4 ${query.loading ? "opacity-50" : ""}`}>
          {state.results.map((r) => (
            <FragranceCard
              key={r.fragrance.id}
              fragrance={r.fragrance}
              matchPercent={r.matchPercent}
              reason={r.reason}
              footer={
                <p className="text-[0.7rem] text-dim">
                  <span className="text-champagne-soft">{r.closeness}</span> · {r.similarityPercent}% profile similarity
                </p>
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}
