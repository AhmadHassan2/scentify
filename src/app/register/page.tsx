import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { getCurrentUser } from "@/lib/auth/session";
import { authMode } from "@/lib/config";
import { safeNextPath } from "@/lib/validation/schemas";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNextPath((await searchParams).next);
  if (await getCurrentUser()) redirect(next);
  return (
    <AuthShell title="Create your account" subtitle="Save your quiz results, build a collection and keep a wishlist. Free, and your quiz answers come with you.">
      <AuthForm mode="register" next={next} authMode={authMode()} />
    </AuthShell>
  );
}
