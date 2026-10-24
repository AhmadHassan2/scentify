import type { FragranceSummary } from "./fragrance";
import type { CollectionItem, FeedbackEvent, PreferenceProfile, WishlistItem } from "./preferences";
import type { WeatherSnapshot } from "./weather";

/** Shapes sent from API routes to the browser. */

export interface ScoreBreakdownDTO {
  scent: number;
  occasion: number;
  budget: number;
  season: number;
  strength: number;
}

export interface RecommendationDTO {
  fragrance: FragranceSummary;
  matchPercent: number;
  components: ScoreBreakdownDTO;
  reasons: string[];
  cautions: string[];
  matchedNotes: string[];
}

export interface RecommendationsResponseDTO {
  results: RecommendationDTO[];
  totalEligible: number;
  excludedSummary: {
    overBudget: number;
    excludedNotes: Record<string, number>;
    owned: number;
    hidden: number;
  };
  engineVersion: string;
}

export interface SimilarDTO {
  fragrance: FragranceSummary;
  similarityPercent: number;
  closeness: string;
  reason: string;
  matchPercent: number | null;
}

export interface TodayPickDTO {
  fragrance: FragranceSummary;
  matchPercent: number;
  reasons: string[];
  cautions: string[];
  fromCollection: boolean;
}

export interface TodayResponseDTO {
  weather: WeatherSnapshot;
  timeOfDay: string;
  source: "collection" | "catalog";
  picks: TodayPickDTO[];
  note: string | null;
}

export interface DiscoverySectionDTO {
  id: string;
  title: string;
  description: string;
  emptyHint?: string;
  items: Array<{ fragrance: FragranceSummary; matchPercent: number; reason: string }>;
}

export interface MeResponseDTO {
  user: { id: string; email: string; displayName: string } | null;
  profile: PreferenceProfile | null;
  feedback: FeedbackEvent[];
  wishlist: WishlistItem[];
  collection: CollectionItem[];
  config: {
    authMode: "supabase" | "demo";
    assistantMode: "openai" | "local";
    weatherMode: "live" | "demo";
    catalogSource: "local" | "supabase";
  };
}

export interface ChatFragranceDTO extends RecommendationDTO {}

export interface ChatResponseDTO {
  message: string;
  fragrances: ChatFragranceDTO[];
  /** Structured filters the assistant applied, shown as chips. */
  appliedFilters: string[];
  toolsUsed: string[];
  mode: "openai" | "local";
  state: Record<string, unknown>;
}
