import type { SimilarDTO } from "@/types/dto";
import { ApiError, parseJson, route } from "@/lib/api";
import { toSummary } from "@/lib/fragrance/utils";
import { resolvePersonalization } from "@/lib/personalization";
import { findSimilar, isBlankProfile, scoreFragrance } from "@/lib/recommendation";
import { personalizationSchema, similarRequestSchema } from "@/lib/validation/schemas";

const schema = similarRequestSchema.extend(personalizationSchema.shape);

export const POST = route(async (request): Promise<{ results: SimilarDTO[] }> => {
  const body = await parseJson(request, schema);
  const p = await resolvePersonalization(body);
  const target = p.catalogIndex.get(body.fragranceId);
  if (!target) throw new ApiError(404, "Fragrance not found");
  const personal = p.hasStoredProfile && !isBlankProfile(p.profile);
  const results = findSimilar(target, [...p.catalogIndex.values()], body.mode, body.limit, p.adjustments.hiddenFragranceIds);
  return {
    results: results.map((r) => ({
      fragrance: toSummary(r.fragrance),
      similarityPercent: Math.round(r.similarity.score * 100),
      closeness: r.closeness,
      reason: r.reason,
      matchPercent: personal ? scoreFragrance(r.fragrance, p.profile, p.adjustments).matchPercent : null,
    })),
  };
});
