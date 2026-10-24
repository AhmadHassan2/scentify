import "server-only";

/**
 * Server-side feature configuration. Every integration is optional; the app
 * degrades to fully functional local/demo behaviour when one is missing.
 */

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function catalogSource(): "local" | "supabase" {
  const explicit = process.env.CATALOG_SOURCE;
  if (explicit === "local" || explicit === "supabase") {
    return explicit === "supabase" && !isSupabaseConfigured() ? "local" : explicit;
  }
  return isSupabaseConfigured() ? "supabase" : "local";
}

export function isOpenAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function openAIModel(): string {
  return process.env.OPENAI_MODEL || "gpt-4o-mini";
}

export function weatherMode(): "live" | "demo" {
  return process.env.WEATHER_MODE === "demo" ? "demo" : "live";
}

export function authMode(): "supabase" | "demo" {
  return isSupabaseConfigured() ? "supabase" : "demo";
}

export interface PublicConfig {
  authMode: "supabase" | "demo";
  catalogSource: "local" | "supabase";
  assistantMode: "openai" | "local";
  weatherMode: "live" | "demo";
}

/** Safe-to-expose summary for the UI (no secrets). */
export function publicConfig(): PublicConfig {
  return {
    authMode: authMode(),
    catalogSource: catalogSource(),
    assistantMode: isOpenAIConfigured() ? "openai" : "local",
    weatherMode: weatherMode(),
  };
}
