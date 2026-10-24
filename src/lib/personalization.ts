import "server-only";
import type { Fragrance } from "@/types/fragrance";
import type {
  CollectionItem,
  FeedbackEvent,
  PreferenceAdjustments,
  PreferenceProfile,
  WishlistItem,
} from "@/types/preferences";
import { getCurrentUser, type AppUser } from "@/lib/auth/session";
import { getCatalogIndex } from "@/lib/database/catalog";
import { getUserStore } from "@/lib/database/user-store";
import { defaultProfile, deriveAdjustments } from "@/lib/recommendation";

/**
 * Single place that assembles "who is this user and what do we know about
 * their taste" for every feature. Signed-in users' feedback and collection
 * come from the database; anonymous visitors send their local profile.
 */

export interface Personalization {
  user: AppUser | null;
  profile: PreferenceProfile;
  hasStoredProfile: boolean;
  feedback: FeedbackEvent[];
  adjustments: PreferenceAdjustments;
  collection: CollectionItem[];
  wishlist: WishlistItem[];
  catalogIndex: Map<string, Fragrance>;
}

export async function resolvePersonalization(input: {
  profile?: PreferenceProfile;
  feedback?: FeedbackEvent[];
} = {}): Promise<Personalization> {
  const [user, catalogIndex] = await Promise.all([getCurrentUser(), getCatalogIndex()]);

  if (!user) {
    const feedback = input.feedback ?? [];
    return {
      user: null,
      profile: input.profile ?? defaultProfile(),
      hasStoredProfile: Boolean(input.profile),
      feedback,
      adjustments: deriveAdjustments(feedback, catalogIndex),
      collection: [],
      wishlist: [],
      catalogIndex,
    };
  }

  const store = getUserStore();
  const [stored, feedback, collection, wishlist] = await Promise.all([
    store.getPreferences(user.id),
    store.getFeedback(user.id),
    store.getCollection(user.id),
    store.getWishlist(user.id),
  ]);
  const profile = input.profile ?? stored ?? defaultProfile();
  return {
    user,
    profile,
    hasStoredProfile: Boolean(stored || input.profile),
    feedback,
    adjustments: deriveAdjustments(feedback, catalogIndex, collection.map((c) => c.fragranceId)),
    collection,
    wishlist,
    catalogIndex,
  };
}
