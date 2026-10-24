import type {
  CollectionItem,
  FeedbackEvent,
  FeedbackType,
  PreferenceProfile,
  WishlistItem,
} from "@/types/preferences";

export type RecommendationSource = "quiz" | "budget" | "today" | "chat" | "discover" | "similar" | "profile";

export interface RecommendationLogEntry {
  source: RecommendationSource;
  request: Record<string, unknown>;
  results: Array<{ fragranceId: string; score: number }>;
  engineVersion: string;
}

export type CollectionPatch = Partial<Pick<CollectionItem, "isFavorite" | "rating" | "personalNotes" | "sizeMl">>;

/** Persistence for everything user-specific. Implemented for Supabase and local demo mode. */
export interface UserDataStore {
  getPreferences(userId: string): Promise<PreferenceProfile | null>;
  savePreferences(userId: string, profile: PreferenceProfile): Promise<void>;

  getWishlist(userId: string): Promise<WishlistItem[]>;
  addToWishlist(userId: string, fragranceId: string): Promise<void>;
  removeFromWishlist(userId: string, fragranceId: string): Promise<void>;

  getCollection(userId: string): Promise<CollectionItem[]>;
  upsertCollectionItem(userId: string, fragranceId: string, patch?: CollectionPatch): Promise<CollectionItem>;
  removeFromCollection(userId: string, fragranceId: string): Promise<void>;

  getFeedback(userId: string): Promise<FeedbackEvent[]>;
  addFeedback(userId: string, fragranceId: string, type: FeedbackType): Promise<void>;
  removeFeedback(userId: string, fragranceId: string, type: FeedbackType): Promise<void>;

  logRecommendations(userId: string, entry: RecommendationLogEntry): Promise<void>;
}
