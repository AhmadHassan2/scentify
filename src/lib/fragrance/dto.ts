import type { RecommendationDTO } from "@/types/dto";
import type { ScoredFragrance } from "@/lib/recommendation";
import { toSummary } from "./utils";

const r2 = (v: number) => Math.round(v * 100) / 100;

export function toRecommendationDTO(s: ScoredFragrance): RecommendationDTO {
  return {
    fragrance: toSummary(s.fragrance),
    matchPercent: s.matchPercent,
    components: {
      scent: r2(s.components.scent),
      occasion: r2(s.components.occasion),
      budget: r2(s.components.budget),
      season: r2(s.components.season),
      strength: r2(s.components.strength),
    },
    reasons: s.reasons,
    cautions: s.cautions,
    matchedNotes: s.matchedNotes,
  };
}
