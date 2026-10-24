"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/config";
import { createSupabaseServerClient } from "@/lib/database/supabase/server";
import { loginSchema, registerSchema, safeNextPath } from "@/lib/validation/schemas";
import {
  LOCAL_SESSION_COOKIE,
  createLocalSession,
  destroyLocalSession,
  localLogin,
  localRegister,
} from "./local-auth";

export interface AuthFormState {
  error: string | null;
  fieldErrors?: Record<string, string>;
  message?: string | null;
}

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  return Object.fromEntries(issues.map((i) => [String(i.path[0]), i.message]));
}

async function setLocalSessionCookie(userId: string) {
  const { token, expires } = await createLocalSession(userId);
  (await cookies()).set(LOCAL_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export async function loginAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: null, fieldErrors: fieldErrors(parsed.error.issues) };
  const { email, password, next } = parsed.data;

  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { error: error.message === "Invalid login credentials" ? "That email and password don't match." : error.message };
    }
  } else {
    const user = await localLogin(email, password);
    if (!user) return { error: "That email and password don't match." };
    await setLocalSessionCookie(user.id);
  }
  redirect(safeNextPath(next));
}

export async function registerAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: null, fieldErrors: fieldErrors(parsed.error.issues) };
  const { email, password, displayName, next } = parsed.data;

  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) return { error: error.message };
    if (!data.session) {
      return { error: null, message: "Check your inbox to confirm your email, then sign in." };
    }
  } else {
    const result = await localRegister(email, password, displayName);
    if ("error" in result) return { error: result.error ?? "Could not create account." };
    await setLocalSessionCookie(result.user.id);
  }
  redirect(safeNextPath(next));
}

export async function logoutAction(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } else {
    const store = await cookies();
    await destroyLocalSession(store.get(LOCAL_SESSION_COOKIE)?.value);
    store.delete(LOCAL_SESSION_COOKIE);
  }
  redirect("/");
}
