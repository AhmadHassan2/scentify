"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Loader2, Sparkles } from "lucide-react";
import type { RecommendationsResponseDTO } from "@/types/dto";
import type { PreferenceProfile } from "@/types/preferences";
import { Bottle } from "@/components/fragrance/bottle";
import { useApiQuery, useDebouncedValue } from "@/hooks/use-api-query";
import { apiPost } from "@/lib/client/api";
import { noteName } from "@/lib/fragrance/notes";
import { FAMILY_META, STRENGTH_LABELS, formatPrice } from "@/lib/fragrance/taxonomy";
import { cn } from "@/lib/utils";
import { noteTone } from "./quiz-steps";

/** Average of the selected families' tones → the preview bottle's liquid colour. */
export function blendTones(hexes: string[], fallback = "#C9BBAA"): string {
  if (!hexes.length) return fallback;
  const rgb = hexes.map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)));
  const avg = [0, 1, 2].map((c) => Math.round(rgb.reduce((s, x) => s + x[c], 0) / rgb.length));
  return `#${avg.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** Positions (percent of the stage) for notes orbiting the bottle. */
const ORBIT = [
  [8, 18], [70, 10], [2, 52], [76, 44], [12, 80], [66, 78], [30, 4], [44, 90], [84, 24], [0, 34],
];

function useLivePreview(profile: PreferenceProfile, enabled: boolean) {
  const debounced = useDebouncedValue(profile, 450);
  const body = { profile: debounced, limit: 3, diversify: false, excludeOwned: true, preview: true };
  return useApiQuery<RecommendationsResponseDTO>(enabled ? JSON.stringify(body) : null, (signal) =>
    apiPost("/api/recommendations", body, { signal }),
  );
}

function hasTaste(p: PreferenceProfile) {
  return p.families.length > 0 || p.likedNotes.length > 0;
}

export function LivePreview({ profile, progress, compact = false }: { profile: PreferenceProfile; progress: number; compact?: boolean }) {
  const liquid = blendTones(profile.families.map((f) => FAMILY_META[f].tone));
  const enabled = hasTaste(profile);
  const { data, loading } = useLivePreview(profile, enabled);
  const results = enabled ? (data?.results ?? []) : [];
  const fill = 0.12 + progress * 0.78;
  const visual = { shape: "round" as const, liquid, glass: "#F4EFE6", cap: "#1b1916", accent: "#7a2e2a" };

  if (compact) {
    const top = results[0];
    return (
      <div className="surface flex items-center gap-4 rounded-2xl p-3 pr-4">
        <div className="h-16 w-12 shrink-0">
          <Bottle visual={visual} brand="Scentify" name="Your blend" fill={fill} title="Your scent blend so far" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[0.65rem] uppercase tracking-[0.16em] text-dim">Live top match</p>
          {top ? (
            <p className="truncate font-display text-lg text-ivory">
              {top.fragrance.name} <span className="text-sm text-champagne-soft">{top.matchPercent}%</span>
            </p>
          ) : (
            <p className="text-sm text-mist">Pick families or notes to see matches</p>
          )}
        </div>
        {loading && <Loader2 className="size-4 animate-spin text-champagne" />}
      </div>
    );
  }

  const notes = profile.likedNotes.slice(0, ORBIT.length);

  return (
    <div className="surface overflow-hidden rounded-lg">
      <div
        className="grain relative h-80"
        style={{ background: `radial-gradient(70% 60% at 50% 45%, ${liquid}33, transparent 70%), #ebe5da` }}
      >
        <motion.div
          className="absolute inset-x-[22%] bottom-6 top-8"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        >
          <Bottle visual={visual} brand="Scentify" name="Your blend" fill={fill} title="Your scent blend so far" />
        </motion.div>
        <AnimatePresence>
          {notes.map((id, i) => (
            <motion.span
              key={id}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1, y: [0, -6, 0] }}
              exit={{ opacity: 0, scale: 0.4 }}
              transition={{ opacity: { duration: 0.3 }, scale: { type: "spring", stiffness: 300, damping: 18 }, y: { duration: 4 + (i % 3), repeat: Infinity, ease: "easeInOut", delay: i * 0.3 } }}
              className="absolute inline-flex items-center gap-1.5 rounded-[3px] bg-graphite px-2 py-1 text-[0.7rem] text-parchment ring-1 ring-ivory/10"
              style={{ left: `${ORBIT[i][0]}%`, top: `${ORBIT[i][1]}%` }}
            >
              <span className="size-2 rounded-full" style={{ background: noteTone(id) }} />
              {noteName(id)}
            </motion.span>
          ))}
        </AnimatePresence>
        <div className="absolute left-4 top-4">
          <p className="eyebrow">Your blend</p>
        </div>
        <div className="absolute bottom-3 left-0 right-0 text-center text-[0.68rem] text-dim">{Math.round(progress * 100)}% composed</div>
      </div>

      <div className="space-y-4 p-5">
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full bg-ivory/[0.06] px-2.5 py-1 text-[0.7rem] text-parchment">
            {formatPrice(profile.budget.min)}–{formatPrice(profile.budget.max)}
          </span>
          {profile.families.map((f) => (
            <span key={f} className="inline-flex items-center gap-1 rounded-[3px] px-2 py-1 text-[0.7rem] text-ivory" style={{ background: `${FAMILY_META[f].tone}55` }}>
              {FAMILY_META[f].label}
            </span>
          ))}
          <span className="rounded-full bg-ivory/[0.06] px-2.5 py-1 text-[0.7rem] text-parchment">{STRENGTH_LABELS[profile.strength]}</span>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-dim">Live matches</p>
            {loading && <Loader2 className="size-3.5 animate-spin text-champagne" aria-label="Updating" />}
          </div>
          {!enabled ? (
            <p className="flex items-start gap-2 rounded-xl bg-ivory/[0.03] p-3 text-xs leading-relaxed text-mist">
              <Sparkles className="mt-0.5 size-3.5 shrink-0 text-champagne" />
              Choose a family or a note and your top matches will appear here, updating as you answer.
            </p>
          ) : (
            <ul className={cn("space-y-2 transition-opacity", loading && "opacity-60")} aria-live="polite">
              <AnimatePresence mode="popLayout" initial={false}>
                {results.map((r, i) => (
                  <motion.li
                    key={r.fragrance.id}
                    layout
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                  >
                    <Link href={`/fragrance/${r.fragrance.slug}`} target="_blank" className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-ivory/[0.04]">
                      <div className="h-12 w-9 shrink-0">
                        <Bottle visual={r.fragrance.visual} brand={r.fragrance.brand} name={r.fragrance.name} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-ivory">{r.fragrance.name}</p>
                        <p className="truncate text-[0.7rem] text-dim">{r.fragrance.brand}</p>
                      </div>
                      <span className="font-display text-lg text-champagne-soft">{r.matchPercent}%</span>
                    </Link>
                  </motion.li>
                ))}
              </AnimatePresence>
              {!loading && results.length === 0 && <li className="text-xs text-mist">Nothing fits every rule yet. Try widening your budget.</li>}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
