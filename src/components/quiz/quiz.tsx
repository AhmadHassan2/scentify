"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, CornerDownLeft } from "lucide-react";
import type { PreferenceProfile } from "@/types/preferences";
import { useApp } from "@/components/providers/app-provider";
import { Bottle } from "@/components/fragrance/bottle";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";
import { FAMILY_META } from "@/lib/fragrance/taxonomy";
import { defaultProfile } from "@/lib/recommendation/defaults";
import { cn } from "@/lib/utils";
import { LivePreview, blendTones } from "./live-preview";
import { QUIZ_STEPS, QuizDataContext } from "./quiz-steps";

const ANALYSIS_LINES = ["Blending your notes…", "Weighing seasons and occasions…", "Scoring the catalog…"];

function Analyzing({ profile, catalogSize }: { profile: PreferenceProfile; catalogSize: number }) {
  const [line, setLine] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setLine((l) => Math.min(l + 1, ANALYSIS_LINES.length - 1)), 550);
    return () => clearInterval(t);
  }, []);
  const liquid = blendTones(profile.families.map((f) => FAMILY_META[f].tone));
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 grid place-items-center bg-ink/95"
      role="status"
      aria-live="polite"
    >
      <div className="text-center">
        <motion.div className="mx-auto h-56 w-40" animate={{ rotate: [0, -4, 4, 0] }} transition={{ duration: 1.6, repeat: Infinity }}>
          <Bottle visual={{ shape: "round", liquid, glass: "#F4EFE6", cap: "#1b1916", accent: "#7a2e2a" }} brand="Scentify" name="Your match" fill={0.95} />
        </motion.div>
        <AnimatePresence mode="wait">
          <motion.p key={line} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mt-8 font-display text-3xl text-ivory">
            {ANALYSIS_LINES[line]}
          </motion.p>
        </AnimatePresence>
        <p className="mt-2 text-sm text-mist">Comparing your profile against {catalogSize} fragrances</p>
      </div>
    </motion.div>
  );
}

export function Quiz({ prices }: { prices: number[] }) {
  const { profile: saved, ready, saveProfile } = useApp();
  const router = useRouter();
  const toast = useToast();
  const reduce = useReducedMotion();
  const [step, setStep] = React.useState(0);
  const [direction, setDirection] = React.useState(1);
  const [profile, setProfile] = React.useState<PreferenceProfile>(defaultProfile());
  const [submitting, setSubmitting] = React.useState(false);
  const [initialized, setInitialized] = React.useState(false);
  const headingRef = React.useRef<HTMLHeadingElement>(null);

  // Pre-fill with saved answers once session state has loaded (adjusting state during render).
  if (ready && !initialized) {
    setInitialized(true);
    if (saved) setProfile(saved);
  }

  React.useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }, [step, reduce]);

  const current = QUIZ_STEPS[step];
  const isLast = step === QUIZ_STEPS.length - 1;
  const patch = (p: Partial<PreferenceProfile>) => setProfile((prev) => ({ ...prev, ...p }));

  const goTo = React.useCallback(
    (target: number) => {
      const next = Math.min(QUIZ_STEPS.length - 1, Math.max(0, target));
      setDirection(next >= step ? 1 : -1);
      setStep(next);
    },
    [step],
  );

  const finish = React.useCallback(async () => {
    setSubmitting(true);
    try {
      await Promise.all([saveProfile(profile), new Promise((r) => setTimeout(r, reduce ? 300 : 1700))]);
      router.push("/recommendations");
    } catch (error) {
      setSubmitting(false);
      toast({ tone: "error", title: "Couldn't save your profile", description: (error as Error).message });
    }
  }, [profile, reduce, router, saveProfile, toast]);

  // Enter advances (unless typing in a field).
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key !== "Enter" || e.shiftKey || el.tagName === "INPUT" || el.tagName === "TEXTAREA" || submitting) return;
      if (el.tagName === "BUTTON" && el.closest("[data-quiz-body]")) return; // let option buttons handle Enter
      e.preventDefault();
      if (isLast) void finish();
      else goTo(step + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finish, goTo, isLast, step, submitting]);

  const selectionCount =
    current.id === "families" ? profile.families.length :
    current.id === "notes" ? profile.likedNotes.length :
    current.id === "occasions" ? profile.occasions.length :
    current.id === "seasons" ? profile.seasons.length :
    current.id === "dislikes" ? profile.dislikedNotes.length + profile.excludedNotes.length + profile.dislikedTraits.length : null;

  const { Component, icon: StepIcon } = current;
  const progress = (step + (isLast ? 1 : 0.5)) / QUIZ_STEPS.length;

  return (
    <QuizDataContext.Provider value={{ prices }}>
      {submitting && <Analyzing profile={profile} catalogSize={prices.length} />}

      {/* Step navigator */}
      <nav aria-label="Quiz progress" className="mb-8">
        <ol className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {QUIZ_STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <li key={s.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  aria-current={active ? "step" : undefined}
                  aria-label={`Question ${i + 1}: ${s.title}`}
                  className={cn(
                    "flex h-10 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-xs transition-all duration-300",
                    active ? "border-champagne bg-ivory text-ink" : done ? "border-champagne/40 bg-champagne/10 text-champagne-soft" : "border-ivory/10 text-dim hover:text-ivory",
                  )}
                >
                  {done ? <Check className="size-3.5" /> : <s.icon className="size-3.5" />}
                  <span className={cn(!active && "hidden md:inline")}>{s.short}</span>
                </button>
              </li>
            );
          })}
        </ol>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-ivory/[0.06]">
          <motion.div className="h-full rounded-full bg-ivory" animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.5 }} />
        </div>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_23rem]">
        <div>
          <div className="mb-6 lg:hidden">
            <LivePreview profile={profile} progress={progress} compact />
          </div>

          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={current.id}
              custom={direction}
              initial={reduce ? { opacity: 0 } : { opacity: 0, x: direction * 48 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, x: direction * -48 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="mb-3 flex items-center gap-3 text-sm text-mist">
                <span className="grid size-9 place-items-center rounded-full bg-champagne/10 ring-1 ring-champagne/30">
                  <StepIcon className="size-4 text-champagne" />
                </span>
                Question {step + 1} of {QUIZ_STEPS.length}
                {saved && <span className="text-dim">· editing saved answers</span>}
              </div>
              <h1 ref={headingRef} tabIndex={-1} className="text-balance text-4xl leading-[1.05] text-ivory outline-none sm:text-5xl lg:text-6xl">
                {current.title}
              </h1>
              <p className="mb-10 mt-4 max-w-2xl text-base text-mist sm:text-lg">{current.subtitle}</p>
              <div data-quiz-body>
                <Component profile={profile} onChange={patch} />
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="sticky bottom-0 z-10 -mx-4 mt-12 border-t border-ivory/[0.07] bg-ink/90 px-4 py-4 sm:mx-0 sm:rounded-full sm:border sm:px-3 sm:py-3">
            <div className="flex items-center justify-between gap-3">
              <Button variant="ghost" size="lg" onClick={() => goTo(step - 1)} disabled={step === 0}>
                <ArrowLeft /> Back
              </Button>
              <div className="flex items-center gap-4">
                <span className="hidden items-center gap-1.5 text-xs text-dim sm:flex" aria-live="polite">
                  {selectionCount ? `${selectionCount} selected` : current.multi ? "Optional" : ""}
                  <span className="ml-2 inline-flex items-center gap-1 rounded-md border border-ivory/10 px-1.5 py-0.5"><CornerDownLeft className="size-3" /> Enter</span>
                </span>
                {isLast ? (
                  <Button size="lg" onClick={() => void finish()} disabled={submitting}>
                    <Check /> See my matches
                  </Button>
                ) : (
                  <Button size="lg" onClick={() => goTo(step + 1)}>
                    {selectionCount === 0 && current.multi ? "Skip" : "Continue"} <ArrowRight />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <aside className="hidden lg:block" aria-label="Live preview">
          <div className="sticky top-24">
            <LivePreview profile={profile} progress={progress} />
          </div>
        </aside>
      </div>
    </QuizDataContext.Provider>
  );
}
