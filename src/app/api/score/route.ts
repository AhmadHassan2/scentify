import { parseJson, route } from "@/lib/api";
import { toRecommendationDTO } from "@/lib/fragrance/dto";
import { resolvePersonalization } from "@/lib/personalization";
import { isBlankProfile, scoreFragrance } from "@/lib/recommendation";
import { scoreRequestSchema } from "@/lib/validation/schemas";

/** Personal match scores for specific fragrances (detail page, wishlist, compare). */
export const POST = route(async (request) => {
  const body = await parseJson(request, scoreRequestSchema);
  const p = await resolvePersonalization(body);
  const hasProfile = p.hasStoredProfile && !isBlankProfile(p.profile);
  const scores = Object.fromEntries(
    body.fragranceIds
      .map((id) => p.catalogIndex.get(id))
      .filter((f) => !!f)
      .map((f) => [f!.id, toRecommendationDTO(scoreFragrance(f!, p.profile, p.adjustments))]),
  );
  return { hasProfile, scores };
});
