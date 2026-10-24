import { z } from "zod";
import {
  FRAGRANCE_FAMILIES,
  OCCASIONS,
  SEASONS,
} from "@/types/fragrance";
import { DISLIKED_TRAITS, FEEDBACK_TYPES } from "@/types/preferences";
import { TIMES_OF_DAY } from "@/types/weather";
import { NOTE_BY_ID } from "@/lib/fragrance/notes";
import { BUDGET_SORTS } from "@/lib/recommendation/budget";
import { SIMILAR_MODES } from "@/lib/recommendation/similarity";

/** Shared request validation — every API route parses input through these. */

const noteId = z.string().refine((id) => id in NOTE_BY_ID, { message: "Unknown note" });
const id = z.string().min(1).max(100);

export const preferenceProfileSchema = z.object({
  budget: z.object({
    min: z.number().min(0).max(5000),
    max: z.number().min(0).max(5000),
    currency: z.literal("CAD"),
    strict: z.boolean(),
  }).refine((b) => b.max >= b.min, { message: "Maximum must be at least the minimum" }),
  families: z.array(z.enum(FRAGRANCE_FAMILIES)).max(13),
  likedNotes: z.array(noteId).max(30),
  occasions: z.array(z.enum(OCCASIONS)).max(7),
  seasons: z.array(z.enum(SEASONS)).max(4),
  strength: z.number().int().min(1).max(5),
  longevityImportance: z.number().int().min(1).max(5),
  versatility: z.enum(["versatile", "specific", "no_preference"]),
  excludedNotes: z.array(noteId).max(40),
  dislikedNotes: z.array(noteId).max(40),
  dislikedTraits: z.array(z.enum(DISLIKED_TRAITS)).max(10),
});

export const feedbackEventSchema = z.object({
  fragranceId: id,
  type: z.enum(FEEDBACK_TYPES),
  createdAt: z.string().max(40),
});

/** Anonymous visitors send their locally stored profile and feedback. */
export const personalizationSchema = z.object({
  profile: preferenceProfileSchema.optional(),
  feedback: z.array(feedbackEventSchema).max(500).optional(),
});

export const recommendRequestSchema = personalizationSchema.extend({
  limit: z.number().int().min(1).max(60).default(24),
  excludeOwned: z.boolean().default(true),
  diversify: z.boolean().default(true),
  source: z.enum(["quiz", "profile"]).default("quiz"),
  /** Live previews (e.g. while answering the quiz) aren't logged to history. */
  preview: z.boolean().default(false),
});

export const scoreRequestSchema = personalizationSchema.extend({
  fragranceIds: z.array(id).min(1).max(60),
});

export const budgetRequestSchema = personalizationSchema.extend({
  filters: z.object({
    minPrice: z.number().min(0).max(5000).default(0),
    maxPrice: z.number().min(0).max(5000).default(150),
    strict: z.boolean().default(true),
    brands: z.array(z.string().max(80)).max(40).default([]),
    families: z.array(z.enum(FRAGRANCE_FAMILIES)).default([]),
    sizesMl: z.array(z.number().positive().max(1000)).max(10).default([]),
    seasons: z.array(z.enum(SEASONS)).default([]),
    occasions: z.array(z.enum(OCCASIONS)).default([]),
    minLongevity: z.number().min(0).max(10).default(0),
    sort: z.enum(BUDGET_SORTS).default("score"),
  }),
  limit: z.number().int().min(1).max(100).default(48),
});

export const similarRequestSchema = z.object({
  fragranceId: id,
  mode: z.enum(SIMILAR_MODES).default("similar"),
  limit: z.number().int().min(1).max(24).default(6),
});

export const weatherLookupSchema = z.union([
  z.object({ kind: z.literal("city"), city: z.string().trim().min(2).max(80) }),
  z.object({ kind: z.literal("coords"), latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }),
  z.object({ kind: z.literal("demo"), preset: z.string().max(40) }),
]);

export const todayRequestSchema = personalizationSchema.extend({
  weather: weatherLookupSchema,
  occasion: z.enum(OCCASIONS).nullable().default(null),
  timeOfDay: z.enum(TIMES_OF_DAY).nullable().default(null),
  desiredProjection: z.number().int().min(1).max(5).nullable().default(null),
  /** Client's local hour, used to infer time of day when not chosen. */
  localHour: z.number().int().min(0).max(23).optional(),
});

export const discoverRequestSchema = personalizationSchema;

export const wishlistMutationSchema = z.object({
  fragranceId: id,
  action: z.enum(["add", "remove"]),
});

export const collectionMutationSchema = z.object({
  fragranceId: id,
  action: z.enum(["upsert", "remove"]),
  patch: z
    .object({
      isFavorite: z.boolean().optional(),
      rating: z.number().int().min(1).max(5).nullable().optional(),
      personalNotes: z.string().max(2000).nullable().optional(),
      sizeMl: z.number().positive().max(1000).nullable().optional(),
    })
    .optional(),
});

export const feedbackMutationSchema = z.object({
  fragranceId: id,
  type: z.enum(FEEDBACK_TYPES),
  action: z.enum(["add", "remove"]),
});

export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

export const chatRequestSchema = personalizationSchema.extend({
  messages: z.array(chatMessageSchema).min(1).max(30),
  /** Structured filters accumulated across turns (local assistant mode). */
  state: z.record(z.string(), z.unknown()).optional(),
  city: z.string().max(80).optional(),
});

export const loginSchema = z.object({
  email: z.email("Enter a valid email address").max(200),
  password: z.string().min(1, "Enter your password").max(200),
  next: z.string().max(200).optional(),
});

export const registerSchema = z.object({
  displayName: z.string().trim().min(1, "Tell us what to call you").max(60),
  email: z.email("Enter a valid email address").max(200),
  password: z.string().min(8, "Use at least 8 characters").max(200),
  next: z.string().max(200).optional(),
});

/** Only allow same-site relative redirects after login. */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return "/";
  return next;
}
