import { parseJson, route } from "@/lib/api";
import { toRecommendationDTO } from "@/lib/fragrance/dto";
import { resolvePersonalization } from "@/lib/personalization";
import { budgetSearch } from "@/lib/recommendation";
import { budgetRequestSchema } from "@/lib/validation/schemas";

export const POST = route(async (request) => {
  const body = await parseJson(request, budgetRequestSchema);
  const p = await resolvePersonalization(body);
  const { results, total } = budgetSearch([...p.catalogIndex.values()], body.filters, p.profile, p.adjustments);
  return {
    total,
    results: results.slice(0, body.limit).map((r) => ({
      ...toRecommendationDTO(r),
      variant: { sizeMl: r.variant.sizeMl, price: r.variant.price, currency: r.variant.currency },
    })),
  };
});
