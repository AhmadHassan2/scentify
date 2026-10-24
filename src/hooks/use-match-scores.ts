"use client";

import type { RecommendationDTO } from "@/types/dto";
import { useApp } from "@/components/providers/app-provider";
import { apiPost } from "@/lib/client/api";
import { useApiQuery } from "./use-api-query";

interface ScoreResponse {
  hasProfile: boolean;
  scores: Record<string, RecommendationDTO>;
}

const EMPTY: Record<string, RecommendationDTO> = {};

/**
 * Personal match scores for a set of fragrance ids. Returns empty scores when
 * the visitor hasn't told us anything yet (we don't show fake "matches").
 */
export function useMatchScores(ids: string[]) {
  const { ready, personalization, feedback, collection } = useApp();
  // Signed-in feedback/collection live server-side, so their sizes join the cache key.
  const key = ready && ids.length ? JSON.stringify({ ids, personalization, fb: feedback.length, col: collection.length }) : null;
  const { data, loading } = useApiQuery<ScoreResponse>(key, async (signal) => {
    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += 60) chunks.push(ids.slice(i, i + 60));
    const responses = await Promise.all(
      chunks.map((fragranceIds) => apiPost<ScoreResponse>("/api/score", { fragranceIds, ...personalization }, { signal })),
    );
    return { hasProfile: responses.some((r) => r.hasProfile), scores: Object.assign({}, ...responses.map((r) => r.scores)) };
  });
  const hasProfile = data?.hasProfile ?? false;
  const allScores = data?.scores ?? EMPTY;
  return { scores: hasProfile ? allScores : EMPTY, allScores, hasProfile, loading };
}
