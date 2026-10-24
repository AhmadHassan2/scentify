"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import type { MeResponseDTO } from "@/types/dto";
import type {
  CollectionItem,
  FeedbackEvent,
  FeedbackType,
  PreferenceProfile,
  WishlistItem,
} from "@/types/preferences";
import { apiGet, apiPost, readLocal, writeLocal } from "@/lib/client/api";
import { useToast } from "@/components/ui/toaster";
import { setLocalValue, useLocalStorageValue } from "@/hooks/use-local-storage";

/**
 * Client-side session state. Signed-in users persist through the API;
 * anonymous visitors keep their quiz profile and feedback in localStorage so
 * the quiz, recommendations and discovery all work without an account.
 */

const KEYS = {
  profile: "scentiq.profile.v1",
  feedback: "scentiq.feedback.v1",
  compare: "scentiq.compare.v1",
} as const;
export const MAX_COMPARE = 3;
const NO_IDS: string[] = [];

type Config = MeResponseDTO["config"];

interface AppState {
  ready: boolean;
  user: MeResponseDTO["user"];
  config: Config | null;
  profile: PreferenceProfile | null;
  feedback: FeedbackEvent[];
  wishlist: WishlistItem[];
  collection: CollectionItem[];
  compareIds: string[];
  wishlistIds: Set<string>;
  collectionIds: Set<string>;
  /** Body fragment every personalized API call should include. */
  personalization: { profile?: PreferenceProfile; feedback?: FeedbackEvent[] };
  saveProfile(profile: PreferenceProfile): Promise<void>;
  toggleFeedback(fragranceId: string, type: FeedbackType): Promise<void>;
  hasFeedback(fragranceId: string, type: FeedbackType): boolean;
  toggleWishlist(fragranceId: string, name?: string): Promise<void>;
  updateCollection(fragranceId: string, action: "upsert" | "remove", patch?: Partial<CollectionItem>, name?: string): Promise<void>;
  toggleCompare(fragranceId: string): void;
  setCompare(ids: string[]): void;
  clearCompare(): void;
  refresh(): Promise<void>;
}

const AppContext = React.createContext<AppState | null>(null);

export function useApp(): AppState {
  const ctx = React.useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = React.useState(false);
  const [user, setUser] = React.useState<MeResponseDTO["user"]>(null);
  const [config, setConfig] = React.useState<Config | null>(null);
  const [profile, setProfile] = React.useState<PreferenceProfile | null>(null);
  const [feedback, setFeedback] = React.useState<FeedbackEvent[]>([]);
  const [wishlist, setWishlist] = React.useState<WishlistItem[]>([]);
  const [collection, setCollection] = React.useState<CollectionItem[]>([]);
  const compareIds = useLocalStorageValue<string[]>(KEYS.compare, NO_IDS);

  const refresh = React.useCallback(async () => {
    try {
      const me = await apiGet<MeResponseDTO>("/api/me");
      setConfig(me.config);
      setUser(me.user);
      if (me.user) {
        // First sign-in after taking the quiz anonymously: carry the profile over.
        const local = readLocal<PreferenceProfile>(KEYS.profile);
        if (!me.profile && local) {
          await apiPost("/api/preferences", local).catch(() => undefined);
          setProfile(local);
        } else {
          setProfile(me.profile);
        }
        const localFeedback = readLocal<FeedbackEvent[]>(KEYS.feedback) ?? [];
        if (localFeedback.length && me.feedback.length === 0) {
          for (const f of localFeedback.slice(0, 50)) {
            await apiPost("/api/feedback", { fragranceId: f.fragranceId, type: f.type, action: "add" }).catch(() => undefined);
          }
          setFeedback(localFeedback);
        } else {
          setFeedback(me.feedback);
        }
        writeLocal(KEYS.feedback, null);
        setWishlist(me.wishlist);
        setCollection(me.collection);
      } else {
        setProfile(readLocal<PreferenceProfile>(KEYS.profile));
        setFeedback(readLocal<FeedbackEvent[]>(KEYS.feedback) ?? []);
        setWishlist([]);
        setCollection([]);
      }
    } catch {
      setProfile(readLocal<PreferenceProfile>(KEYS.profile));
      setFeedback(readLocal<FeedbackEvent[]>(KEYS.feedback) ?? []);
    } finally {
      setReady(true);
    }
  }, []);

  // Re-hydrate on navigation between auth pages (login/logout redirects).
  const lastAuthPath = React.useRef<string | null>(null);
  React.useEffect(() => {
    const wasAuthPage = lastAuthPath.current === "/login" || lastAuthPath.current === "/register";
    if (!ready || wasAuthPage) void refresh();
    lastAuthPath.current = pathname;
  }, [pathname, ready, refresh]);

  const requireAccount = React.useCallback(
    (what: string) => {
      toast({
        tone: "info",
        title: `Sign in to use your ${what}`,
        description: "Browsing and the quiz work without an account; saving needs one.",
        action: { label: "Sign in", href: `/login?next=${encodeURIComponent(pathname)}` },
      });
    },
    [pathname, toast],
  );

  const saveProfile = React.useCallback(
    async (next: PreferenceProfile) => {
      setProfile(next);
      writeLocal(KEYS.profile, next);
      if (user) await apiPost("/api/preferences", next);
    },
    [user],
  );

  const hasFeedback = React.useCallback(
    (fragranceId: string, type: FeedbackType) => feedback.some((f) => f.fragranceId === fragranceId && f.type === type),
    [feedback],
  );

  const toggleFeedback = React.useCallback(
    async (fragranceId: string, type: FeedbackType) => {
      const exists = feedback.some((f) => f.fragranceId === fragranceId && f.type === type);
      const optimistic = exists
        ? feedback.filter((f) => !(f.fragranceId === fragranceId && f.type === type))
        : [...feedback, { fragranceId, type, createdAt: new Date().toISOString() }];
      const previous = feedback;
      setFeedback(optimistic);
      try {
        if (user) {
          const res = await apiPost<{ feedback: FeedbackEvent[] }>("/api/feedback", { fragranceId, type, action: exists ? "remove" : "add" });
          setFeedback(res.feedback);
        } else {
          writeLocal(KEYS.feedback, optimistic);
        }
      } catch (error) {
        setFeedback(previous);
        toast({ tone: "error", title: "Couldn't save feedback", description: (error as Error).message });
      }
    },
    [feedback, toast, user],
  );

  const toggleWishlist = React.useCallback(
    async (fragranceId: string, name?: string) => {
      if (!user) return requireAccount("wishlist");
      const exists = wishlist.some((w) => w.fragranceId === fragranceId);
      const previous = wishlist;
      setWishlist(exists ? wishlist.filter((w) => w.fragranceId !== fragranceId) : [{ fragranceId, addedAt: new Date().toISOString(), note: null }, ...wishlist]);
      try {
        const res = await apiPost<{ wishlist: WishlistItem[] }>("/api/wishlist", { fragranceId, action: exists ? "remove" : "add" });
        setWishlist(res.wishlist);
        toast({
          tone: "success",
          title: exists ? "Removed from wishlist" : "Saved to wishlist",
          description: name,
          action: exists ? undefined : { label: "View wishlist", href: "/wishlist" },
        });
      } catch (error) {
        setWishlist(previous);
        toast({ tone: "error", title: "Couldn't update wishlist", description: (error as Error).message });
      }
    },
    [requireAccount, toast, user, wishlist],
  );

  const updateCollection = React.useCallback(
    async (fragranceId: string, action: "upsert" | "remove", patch?: Partial<CollectionItem>, name?: string) => {
      if (!user) return requireAccount("collection");
      const isNew = !collection.some((c) => c.fragranceId === fragranceId);
      const previous = collection;
      if (action === "remove") setCollection(collection.filter((c) => c.fragranceId !== fragranceId));
      else if (!isNew) setCollection(collection.map((c) => (c.fragranceId === fragranceId ? { ...c, ...patch } : c)));
      try {
        const res = await apiPost<{ collection: CollectionItem[]; wishlist: WishlistItem[] }>("/api/collection", {
          fragranceId,
          action,
          patch: patch && {
            isFavorite: patch.isFavorite,
            rating: patch.rating,
            personalNotes: patch.personalNotes,
            sizeMl: patch.sizeMl,
          },
        });
        setCollection(res.collection);
        setWishlist(res.wishlist);
        if (action === "remove") toast({ tone: "success", title: "Removed from collection", description: name });
        else if (isNew) toast({ tone: "success", title: "Added to your collection", description: name, action: { label: "View collection", href: "/collection" } });
      } catch (error) {
        setCollection(previous);
        toast({ tone: "error", title: "Couldn't update collection", description: (error as Error).message });
      }
    },
    [collection, requireAccount, toast, user],
  );

  const toggleCompare = React.useCallback(
    (fragranceId: string) => {
      if (compareIds.includes(fragranceId)) {
        setLocalValue(KEYS.compare, compareIds.filter((id) => id !== fragranceId));
      } else if (compareIds.length >= MAX_COMPARE) {
        toast({ tone: "info", title: `Compare up to ${MAX_COMPARE} fragrances`, description: "Remove one from the compare tray first." });
      } else {
        setLocalValue(KEYS.compare, [...compareIds, fragranceId]);
      }
    },
    [compareIds, toast],
  );

  const setCompare = React.useCallback((ids: string[]) => setLocalValue(KEYS.compare, ids.slice(0, MAX_COMPARE)), []);
  const clearCompare = React.useCallback(() => setLocalValue(KEYS.compare, []), []);

  const value = React.useMemo<AppState>(
    () => ({
      ready,
      user,
      config,
      profile,
      feedback,
      wishlist,
      collection,
      compareIds,
      wishlistIds: new Set(wishlist.map((w) => w.fragranceId)),
      collectionIds: new Set(collection.map((c) => c.fragranceId)),
      personalization: user ? { profile: profile ?? undefined } : { profile: profile ?? undefined, feedback },
      saveProfile,
      toggleFeedback,
      hasFeedback,
      toggleWishlist,
      updateCollection,
      toggleCompare,
      setCompare,
      clearCompare,
      refresh: async () => {
        await refresh();
        router.refresh();
      },
    }),
    [ready, user, config, profile, feedback, wishlist, collection, compareIds, saveProfile, toggleFeedback, hasFeedback, toggleWishlist, updateCollection, toggleCompare, setCompare, clearCompare, refresh, router],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
