import type { DiscoverySectionDTO } from "@/types/dto";
import { parseJson, route } from "@/lib/api";
import { toSummary } from "@/lib/fragrance/utils";
import { resolvePersonalization } from "@/lib/personalization";
import { discover } from "@/lib/recommendation";
import { discoverRequestSchema } from "@/lib/validation/schemas";

export const POST = route(async (request): Promise<{ sections: DiscoverySectionDTO[]; personalized: boolean }> => {
  const body = await parseJson(request, discoverRequestSchema);
  const p = await resolvePersonalization(body);
  const favoriteIds = [
    ...p.collection.filter((c) => c.isFavorite || (c.rating ?? 0) >= 4).map((c) => c.fragranceId),
    ...p.adjustments.lovedFragranceIds,
  ];
  const sections = discover([...p.catalogIndex.values()], {
    profile: p.profile,
    adjustments: p.adjustments,
    favoriteIds: [...new Set(favoriteIds)],
  });
  return {
    personalized: p.hasStoredProfile || favoriteIds.length > 0,
    sections: sections.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      emptyHint: s.emptyHint,
      items: s.items.map((i) => ({ fragrance: toSummary(i.fragrance), matchPercent: i.matchPercent, reason: i.reason })),
    })),
  };
});
