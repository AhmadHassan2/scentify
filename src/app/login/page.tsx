import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { getCurrentUser } from "@/lib/auth/session";
import { authMode } from "@/lib/config";
import { safeNextPath } from "@/lib/validation/schemas";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNextPath((await searchParams).next);
  if (await getCurrentUser()) redirect(next);
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your wishlist, collection and saved fragrance profile.">
      <AuthForm mode="login" next={next} authMode={authMode()} />
    </AuthShell>
  );
}
