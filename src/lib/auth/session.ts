import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/config";
import { createSupabaseServerClient } from "@/lib/database/supabase/server";
import { LOCAL_SESSION_COOKIE, getLocalSessionUser } from "./local-auth";

export interface AppUser {
  id: string;
  email: string;
  displayName: string;
}

/** The signed-in user for this request, or null. Deduplicated per request. */
export const getCurrentUser = cache(async (): Promise<AppUser | null> => {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    const meta = data.user.user_metadata as { display_name?: string } | undefined;
    return {
      id: data.user.id,
      email: data.user.email ?? "",
      displayName: meta?.display_name || (data.user.email ?? "").split("@")[0],
    };
  }
  const token = (await cookies()).get(LOCAL_SESSION_COOKIE)?.value;
  return getLocalSessionUser(token);
});

/** For server components/pages that need a signed-in user. */
export async function requireUser(nextPath: string): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return user;
}
