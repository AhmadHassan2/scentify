import "server-only";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type {
  CollectionItem,
  FeedbackEvent,
  FeedbackType,
  PreferenceProfile,
  WishlistItem,
} from "@/types/preferences";
import type { CollectionPatch, RecommendationLogEntry, UserDataStore } from "./types";

/**
 * Local demo persistence: a single JSON file under ./.data. Used only when
 * Supabase isn't configured, so the full app works offline in development.
 * Not intended for multi-instance or serverless production deployments.
 */

export interface LocalUserRecord {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
}

interface UserData {
  preferences: PreferenceProfile | null;
  wishlist: WishlistItem[];
  collection: CollectionItem[];
  feedback: FeedbackEvent[];
  history: Array<RecommendationLogEntry & { createdAt: string }>;
}

export interface LocalDatabase {
  users: Record<string, LocalUserRecord>;
  sessions: Record<string, { userId: string; expiresAt: string }>;
  data: Record<string, UserData>;
}

const FILE = resolve(process.cwd(), ".data", "demo-store.json");

/**
 * Shared on globalThis: Next bundles server actions and route handlers
 * separately, so module-level state would give each its own stale copy.
 * The file's mtime is checked on every read so changes are always seen.
 */
const shared = ((globalThis as { __scentiqLocalDb?: { memory: LocalDatabase | null; mtimeMs: number; queue: Promise<unknown> } })
  .__scentiqLocalDb ??= { memory: null, mtimeMs: -1, queue: Promise.resolve() });

async function readDb(): Promise<LocalDatabase> {
  let mtimeMs = 0;
  try {
    mtimeMs = (await stat(FILE)).mtimeMs;
  } catch {
    mtimeMs = 0;
  }
  if (shared.memory && shared.mtimeMs === mtimeMs) return shared.memory;
  try {
    shared.memory = JSON.parse(await readFile(FILE, "utf8")) as LocalDatabase;
  } catch {
    shared.memory = { users: {}, sessions: {}, data: {} };
  }
  shared.mtimeMs = mtimeMs;
  return shared.memory;
}

async function persist(db: LocalDatabase) {
  await mkdir(dirname(FILE), { recursive: true });
  const tmp = `${FILE}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, JSON.stringify(db, null, 1));
  await rename(tmp, FILE);
  shared.mtimeMs = (await stat(FILE)).mtimeMs;
}

/** Serialize all mutations so concurrent requests can't clobber each other. */
export function mutateLocalDb<T>(fn: (db: LocalDatabase) => T | Promise<T>): Promise<T> {
  const run = shared.queue.then(async () => {
    const db = await readDb();
    const result = await fn(db);
    await persist(db);
    return result;
  });
  shared.queue = run.catch(() => undefined);
  return run;
}

export async function readLocalDb(): Promise<LocalDatabase> {
  await shared.queue;
  return readDb();
}

function userData(db: LocalDatabase, userId: string): UserData {
  db.data[userId] ??= { preferences: null, wishlist: [], collection: [], feedback: [], history: [] };
  return db.data[userId];
}

export class LocalUserStore implements UserDataStore {
  async getPreferences(userId: string) {
    return (await readLocalDb()).data[userId]?.preferences ?? null;
  }

  async savePreferences(userId: string, profile: PreferenceProfile) {
    await mutateLocalDb((db) => {
      userData(db, userId).preferences = profile;
    });
  }

  async getWishlist(userId: string) {
    return [...((await readLocalDb()).data[userId]?.wishlist ?? [])];
  }

  async addToWishlist(userId: string, fragranceId: string) {
    await mutateLocalDb((db) => {
      const d = userData(db, userId);
      if (!d.wishlist.some((w) => w.fragranceId === fragranceId)) {
        d.wishlist.unshift({ fragranceId, addedAt: new Date().toISOString(), note: null });
      }
    });
  }

  async removeFromWishlist(userId: string, fragranceId: string) {
    await mutateLocalDb((db) => {
      const d = userData(db, userId);
      d.wishlist = d.wishlist.filter((w) => w.fragranceId !== fragranceId);
    });
  }

  async getCollection(userId: string) {
    return [...((await readLocalDb()).data[userId]?.collection ?? [])];
  }

  async upsertCollectionItem(userId: string, fragranceId: string, patch: CollectionPatch = {}) {
    return mutateLocalDb((db) => {
      const d = userData(db, userId);
      let item = d.collection.find((c) => c.fragranceId === fragranceId);
      if (!item) {
        item = { fragranceId, addedAt: new Date().toISOString(), isFavorite: false, rating: null, personalNotes: null, sizeMl: null };
        d.collection.unshift(item);
      }
      Object.assign(item, patch);
      return { ...item };
    });
  }

  async removeFromCollection(userId: string, fragranceId: string) {
    await mutateLocalDb((db) => {
      const d = userData(db, userId);
      d.collection = d.collection.filter((c) => c.fragranceId !== fragranceId);
    });
  }

  async getFeedback(userId: string) {
    return [...((await readLocalDb()).data[userId]?.feedback ?? [])];
  }

  async addFeedback(userId: string, fragranceId: string, type: FeedbackType) {
    await mutateLocalDb((db) => {
      const d = userData(db, userId);
      if (!d.feedback.some((f) => f.fragranceId === fragranceId && f.type === type)) {
        d.feedback.push({ fragranceId, type, createdAt: new Date().toISOString() });
      }
    });
  }

  async removeFeedback(userId: string, fragranceId: string, type: FeedbackType) {
    await mutateLocalDb((db) => {
      const d = userData(db, userId);
      d.feedback = d.feedback.filter((f) => !(f.fragranceId === fragranceId && f.type === type));
    });
  }

  async logRecommendations(userId: string, entry: RecommendationLogEntry) {
    await mutateLocalDb((db) => {
      const d = userData(db, userId);
      d.history.unshift({ ...entry, createdAt: new Date().toISOString() });
      d.history = d.history.slice(0, 50);
    });
  }
}
