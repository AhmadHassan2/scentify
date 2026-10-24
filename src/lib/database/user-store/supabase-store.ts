import "server-only";
import type {
  CollectionItem,
  DislikedTrait,
  FeedbackType,
  PreferenceProfile,
  VersatilityPreference,
} from "@/types/preferences";
import type { FragranceFamily, Occasion, Season } from "@/types/fragrance";
import { createSupabaseServerClient } from "../supabase/server";
import type { CollectionPatch, RecommendationLogEntry, UserDataStore } from "./types";

/**
 * Supabase-backed persistence. Uses the per-request, cookie-bound client so
 * Row Level Security enforces ownership in the database, not just in code.
 */

function check(error: { message: string } | null, action: string) {
  if (error) throw new Error(`Supabase ${action} failed: ${error.message}`);
}

interface PreferencesRow {
  budget_min: number; budget_max: number; budget_strict: boolean; currency: "CAD";
  families: FragranceFamily[]; liked_notes: string[]; occasions: Occasion[]; seasons: Season[];
  strength: number; longevity_importance: number; versatility: VersatilityPreference;
  excluded_notes: string[]; disliked_notes: string[]; disliked_traits: DislikedTrait[];
}

interface CollectionRow {
  fragrance_id: string; added_at: string; is_favorite: boolean; rating: number | null;
  personal_notes: string | null; size_ml: number | null;
}

const toCollectionItem = (r: CollectionRow): CollectionItem => ({
  fragranceId: r.fragrance_id,
  addedAt: r.added_at,
  isFavorite: r.is_favorite,
  rating: r.rating,
  personalNotes: r.personal_notes,
  sizeMl: r.size_ml === null ? null : Number(r.size_ml),
});

export class SupabaseUserStore implements UserDataStore {
  async getPreferences(userId: string): Promise<PreferenceProfile | null> {
    const db = await createSupabaseServerClient();
    const { data, error } = await db.from("user_preferences").select("*").eq("user_id", userId).maybeSingle();
    check(error, "read preferences");
    if (!data) return null;
    const r = data as PreferencesRow;
    return {
      budget: { min: Number(r.budget_min), max: Number(r.budget_max), strict: r.budget_strict, currency: r.currency },
      families: r.families, likedNotes: r.liked_notes, occasions: r.occasions, seasons: r.seasons,
      strength: r.strength, longevityImportance: r.longevity_importance, versatility: r.versatility,
      excludedNotes: r.excluded_notes, dislikedNotes: r.disliked_notes, dislikedTraits: r.disliked_traits,
    };
  }

  async savePreferences(userId: string, p: PreferenceProfile) {
    const db = await createSupabaseServerClient();
    const { error } = await db.from("user_preferences").upsert({
      user_id: userId,
      budget_min: p.budget.min, budget_max: p.budget.max, budget_strict: p.budget.strict, currency: p.budget.currency,
      families: p.families, liked_notes: p.likedNotes, occasions: p.occasions, seasons: p.seasons,
      strength: p.strength, longevity_importance: p.longevityImportance, versatility: p.versatility,
      excluded_notes: p.excludedNotes, disliked_notes: p.dislikedNotes, disliked_traits: p.dislikedTraits,
    });
    check(error, "save preferences");
  }

  async getWishlist(userId: string) {
    const db = await createSupabaseServerClient();
    const { data, error } = await db
      .from("wishlists").select("fragrance_id, added_at, note").eq("user_id", userId).order("added_at", { ascending: false });
    check(error, "read wishlist");
    return (data ?? []).map((r) => ({ fragranceId: r.fragrance_id as string, addedAt: r.added_at as string, note: r.note as string | null }));
  }

  async addToWishlist(userId: string, fragranceId: string) {
    const db = await createSupabaseServerClient();
    const { error } = await db.from("wishlists").upsert({ user_id: userId, fragrance_id: fragranceId }, { onConflict: "user_id,fragrance_id", ignoreDuplicates: true });
    check(error, "add to wishlist");
  }

  async removeFromWishlist(userId: string, fragranceId: string) {
    const db = await createSupabaseServerClient();
    const { error } = await db.from("wishlists").delete().eq("user_id", userId).eq("fragrance_id", fragranceId);
    check(error, "remove from wishlist");
  }

  async getCollection(userId: string) {
    const db = await createSupabaseServerClient();
    const { data, error } = await db
      .from("user_collections")
      .select("fragrance_id, added_at, is_favorite, rating, personal_notes, size_ml")
      .eq("user_id", userId)
      .order("added_at", { ascending: false });
    check(error, "read collection");
    return ((data ?? []) as CollectionRow[]).map(toCollectionItem);
  }

  async upsertCollectionItem(userId: string, fragranceId: string, patch: CollectionPatch = {}) {
    const db = await createSupabaseServerClient();
    const row: Record<string, unknown> = { user_id: userId, fragrance_id: fragranceId };
    if (patch.isFavorite !== undefined) row.is_favorite = patch.isFavorite;
    if (patch.rating !== undefined) row.rating = patch.rating;
    if (patch.personalNotes !== undefined) row.personal_notes = patch.personalNotes;
    if (patch.sizeMl !== undefined) row.size_ml = patch.sizeMl;
    const { data, error } = await db
      .from("user_collections")
      .upsert(row, { onConflict: "user_id,fragrance_id" })
      .select("fragrance_id, added_at, is_favorite, rating, personal_notes, size_ml")
      .single();
    check(error, "update collection");
    return toCollectionItem(data as CollectionRow);
  }

  async removeFromCollection(userId: string, fragranceId: string) {
    const db = await createSupabaseServerClient();
    const { error } = await db.from("user_collections").delete().eq("user_id", userId).eq("fragrance_id", fragranceId);
    check(error, "remove from collection");
  }

  async getFeedback(userId: string) {
    const db = await createSupabaseServerClient();
    const { data, error } = await db
      .from("fragrance_feedback").select("fragrance_id, feedback, created_at").eq("user_id", userId).order("created_at");
    check(error, "read feedback");
    return (data ?? []).map((r) => ({ fragranceId: r.fragrance_id as string, type: r.feedback as FeedbackType, createdAt: r.created_at as string }));
  }

  async addFeedback(userId: string, fragranceId: string, type: FeedbackType) {
    const db = await createSupabaseServerClient();
    const { error } = await db
      .from("fragrance_feedback")
      .upsert({ user_id: userId, fragrance_id: fragranceId, feedback: type }, { onConflict: "user_id,fragrance_id,feedback", ignoreDuplicates: true });
    check(error, "add feedback");
  }

  async removeFeedback(userId: string, fragranceId: string, type: FeedbackType) {
    const db = await createSupabaseServerClient();
    const { error } = await db.from("fragrance_feedback").delete().eq("user_id", userId).eq("fragrance_id", fragranceId).eq("feedback", type);
    check(error, "remove feedback");
  }

  async logRecommendations(userId: string, entry: RecommendationLogEntry) {
    const db = await createSupabaseServerClient();
    const { error } = await db.from("recommendation_history").insert({
      user_id: userId, source: entry.source, request: entry.request, results: entry.results, engine_version: entry.engineVersion,
    });
    // History is best-effort; never fail a user request because logging failed.
    if (error) console.warn("[history] failed to log recommendations:", error.message);
  }
}
