import "server-only";
import { isSupabaseConfigured } from "@/lib/config";
import { LocalUserStore } from "./local-store";
import { SupabaseUserStore } from "./supabase-store";
import type { UserDataStore } from "./types";

export type { UserDataStore, RecommendationLogEntry, RecommendationSource, CollectionPatch } from "./types";

let local: LocalUserStore | null = null;

export function getUserStore(): UserDataStore {
  if (isSupabaseConfigured()) return new SupabaseUserStore();
  local ??= new LocalUserStore();
  return local;
}
