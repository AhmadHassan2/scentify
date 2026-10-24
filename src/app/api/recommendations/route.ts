import type { RecommendationsResponseDTO } from "@/types/dto";
import { parseJson, route } from "@/lib/api";
import { getUserStore } from "@/lib/database/user-store";
import { toRecommendationDTO } from "@/lib/fragrance/dto";
import { resolvePersonalization } from "@/lib/personalization";
import { recommend } from "@/lib/recommendation";
import { recommendRequestSchema } from "@/lib/validation/schemas";

export const POST = route(async (request): Promise<RecommendationsResponseDTO> => {
  const body = await parseJson(request, recommendRequestSchema);
  const p = await resolvePersonalization(body);
  const res = recommend([...p.catalogIndex.values()], p.profile, {
    adjustments: p.adjustments,
    excludeOwned: body.excludeOwned,
    limit: body.limit,
    diversify: body.diversify,
  });

  if (p.user && !body.preview) {
    void getUserStore().logRecommendations(p.user.id, {
      source: body.source,
      request: { profile: p.profile, limit: body.limit },
      results: res.results.map((r) => ({ fragranceId: r.fragrance.id, score: Math.round(r.score * 1000) / 1000 })),
      engineVersion: res.engineVersion,
    });
  }

  return {
    results: res.results.map(toRecommendationDTO),
    totalEligible: res.totalEligible,
    excludedSummary: res.excludedSummary,
    engineVersion: res.engineVersion,
  };
});
