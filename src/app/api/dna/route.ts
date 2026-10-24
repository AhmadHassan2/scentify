import type { Fragrance } from "@/types/fragrance";
import { parseJson, route } from "@/lib/api";
import { toSummary } from "@/lib/fragrance/utils";
import { resolvePersonalization } from "@/lib/personalization";
import { buildFragranceDNA } from "@/lib/recommendation";
import { personalizationSchema } from "@/lib/validation/schemas";

export const POST = route(async (request) => {
  const body = await parseJson(request, personalizationSchema);
  const p = await resolvePersonalization(body);
  const collection = p.collection
    .map((item) => ({ item, fragrance: p.catalogIndex.get(item.fragranceId) }))
    .filter((x): x is { item: typeof x.item; fragrance: Fragrance } => !!x.fragrance);
  const dna = buildFragranceDNA({
    profile: p.profile,
    adjustments: p.adjustments,
    collection,
    feedbackCount: p.feedback.length,
  });
  const feedbackFragrances = [...new Set(p.feedback.map((f) => f.fragranceId))]
    .map((id) => p.catalogIndex.get(id))
    .filter((f): f is Fragrance => !!f)
    .map(toSummary);
  return {
    dna,
    adjustments: {
      softPriceCeiling: p.adjustments.softPriceCeiling,
      projectionCap: p.adjustments.projectionCap,
      sweetnessCap: p.adjustments.attributeCaps.sweetness ?? null,
      hiddenCount: p.adjustments.hiddenFragranceIds.length,
    },
    feedbackFragrances,
  };
});
