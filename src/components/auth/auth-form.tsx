"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { loginAction, registerAction, type AuthFormState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/primitives";

const initial: AuthFormState = { error: null };

function Field({ name, label, type = "text", autoComplete, error, hint }: { name: string; label: string; type?: string; autoComplete?: string; error?: string; hint?: string }) {
  const id = `field-${name}`;
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} type={type} autoComplete={autoComplete} required aria-invalid={!!error} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined} />
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-danger">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-dim">{hint}</p>
      ) : null}
    </div>
  );
}

export function AuthForm({ mode, next, authMode }: { mode: "login" | "register"; next: string; authMode: "supabase" | "demo" }) {
  const [state, action, pending] = useActionState(mode === "login" ? loginAction : registerAction, initial);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next} />
      {mode === "register" && <Field name="displayName" label="What should we call you?" autoComplete="given-name" error={fe.displayName} />}
      <Field name="email" label="Email" type="email" autoComplete="email" error={fe.email} />
      <Field
        name="password"
        label="Password"
        type="password"
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        error={fe.password}
        hint={mode === "register" ? "At least 8 characters." : undefined}
      />
      {state.error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/[0.06] px-4 py-3 text-sm text-danger">{state.error}</p>}
      {state.message && <p role="status" className="rounded-xl border border-champagne/25 bg-champagne/[0.06] px-4 py-3 text-sm text-champagne-soft">{state.message}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />}
        {mode === "login" ? "Sign in" : "Create account"}
      </Button>
      <p className="text-center text-sm text-mist">
        {mode === "login" ? "New to Scentify? " : "Already have an account? "}
        <Link href={`/${mode === "login" ? "register" : "login"}?next=${encodeURIComponent(next)}`} className="text-champagne hover:underline">
          {mode === "login" ? "Create an account" : "Sign in"}
        </Link>
      </p>
      {authMode === "demo" && (
        <p className="rounded-xl border border-ivory/10 bg-ivory/[0.02] px-4 py-3 text-xs leading-relaxed text-dim">
          <span className="text-mist">Local demo mode:</span> Supabase isn&apos;t configured, so accounts are stored on this machine in <code>.data/</code> with hashed passwords. Any email works.
        </p>
      )}
    </form>
  );
}
