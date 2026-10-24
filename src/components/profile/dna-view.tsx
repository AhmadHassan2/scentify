"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, Dna, Loader2, RotateCcw, Save, Undo2 } from "lucide-react";
import type { FragranceSummary } from "@/types/fragrance";
import { OCCASIONS, SEASONS } from "@/types/fragrance";
import type { FeedbackType, PreferenceProfile } from "@/types/preferences";
import type { FragranceDNA } from "@/lib/recommendation/dna";
import { useApp } from "@/components/providers/app-provider";
import {
  BudgetStep,
  DislikesStep,
  FamiliesStep,
  LongevityStep,
  NotesStep,
  OccasionsStep,
  SeasonsStep,
  StrengthStep,
  VersatilityStep,
  type StepProps,
} from "@/components/quiz/quiz-steps";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/primitives";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useToast } from "@/components/ui/toaster";
import { apiPost } from "@/lib/client/api";
import { useApiQuery } from "@/hooks/use-api-query";
import { noteName } from "@/lib/fragrance/notes";
import { OCCASION_META, SEASON_META, STRENGTH_LABELS, formatPrice } from "@/lib/fragrance/taxonomy";
import { FEEDBACK_META } from "@/lib/recommendation/feedback";
import { defaultProfile } from "@/lib/recommendation/defaults";
import { cn } from "@/lib/utils";
import { BarList, FamilyRadar, NoteCloud } from "./dna-charts";

interface DnaResponse {
  dna: FragranceDNA;
  adjustments: { softPriceCeiling: number | null; projectionCap: number | null; sweetnessCap: number | null; hiddenCount: number };
  feedbackFragrances: FragranceSummary[];
}

const EDIT_SECTIONS: Array<{ id: string; title: string; Component: React.ComponentType<StepProps> }> = [
  { id: "budget", title: "Budget", Component: BudgetStep },
  { id: "families", title: "Scent families", Component: FamiliesStep },
  { id: "notes", title: "Favourite notes", Component: NotesStep },
  { id: "dislikes", title: "Disliked & excluded notes", Component: DislikesStep },
  { id: "occasions", title: "Occasions", Component: OccasionsStep },
  { id: "seasons", title: "Seasons", Component: SeasonsStep },
  { id: "strength", title: "Strength", Component: StrengthStep },
  { id: "longevity", title: "Longevity", Component: LongevityStep },
  { id: "versatility", title: "Versatility", Component: VersatilityStep },
];

function PreferenceEditor({ initial }: { initial: PreferenceProfile }) {
  const { saveProfile } = useApp();
  const toast = useToast();
  const [draft, setDraft] = React.useState(initial);
  const [open, setOpen] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);

  const save = async () => {
    setSaving(true);
    try {
      await saveProfile(draft);
      toast({ tone: "success", title: "Preferences updated", description: "Your recommendations have been re-ranked." });
    } catch (e) {
      toast({ tone: "error", title: "Couldn't save preferences", description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 p-6">
        <div>
          <h2 className="text-3xl text-ivory">Update your preferences</h2>
          <p className="mt-1 text-sm text-mist">Changes apply everywhere: matches, budget finder, discovery and daily picks.</p>
        </div>
        <div className="flex gap-2">
          {dirty && <Button variant="ghost" size="sm" onClick={() => setDraft(initial)}><RotateCcw /> Discard</Button>}
          <Button size="sm" onClick={save} disabled={!dirty || saving}>{saving ? <Loader2 className="animate-spin" /> : <Save />} Save changes</Button>
        </div>
      </div>
      <div className="divide-y divide-ivory/[0.07] border-t border-ivory/[0.07]">
        {EDIT_SECTIONS.map(({ id, title, Component }) => (
          <div key={id}>
            <button
              type="button"
              onClick={() => setOpen(open === id ? null : id)}
              aria-expanded={open === id}
              aria-controls={`edit-${id}`}
              className="flex w-full cursor-pointer items-center justify-between px-6 py-4 text-left hover:bg-ivory/[0.02]"
            >
              <span className="font-display text-xl text-parchment">{title}</span>
              <ChevronDown className={cn("size-4 text-mist transition-transform", open === id && "rotate-180")} />
            </button>
            {open === id && (
              <div id={`edit-${id}`} className="px-6 pb-6">
                <Component profile={draft} onChange={(p) => setDraft((d) => ({ ...d, ...p }))} />
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

export function DnaView() {
  const { ready, profile, feedback, collection, personalization, toggleFeedback, user } = useApp();
  const key = ready ? JSON.stringify({ personalization, feedback, collection }) : null;
  const { data, error, retry } = useApiQuery<DnaResponse>(key, (signal) => apiPost("/api/dna", personalization, { signal }));

  if (error) return <ErrorState message={error} onRetry={retry} />;
  if (!ready || !data) return <div className="grid gap-5 lg:grid-cols-2"><div className="skeleton h-96 rounded-2xl" /><div className="skeleton h-96 rounded-2xl" /></div>;

  const { dna } = data;
  const empty = !dna.sources.stated && !dna.sources.feedbackCount && !dna.sources.collectionCount;
  const byId = new Map(data.feedbackFragrances.map((f) => [f.id, f]));

  return (
    <div className="space-y-8">
      {empty ? (
        <EmptyState
          icon={Dna}
          title="Your DNA is still blank"
          description="Take the quiz, react to fragrances, or add what you own. Each source sharpens the picture."
          action={<Button asChild><Link href="/quiz">Take the quiz</Link></Button>}
        />
      ) : (
        <>
          <Card className="relative overflow-hidden p-7 sm:p-9">
            <p className="eyebrow mb-3">Your fragrance archetype</p>
            <h2 className="font-display text-5xl text-ivory sm:text-6xl"><span className="gold-text">{dna.title}</span></h2>
            <p className="mt-3 max-w-xl text-mist">{dna.summary}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge>{dna.sources.stated ? "Quiz answers" : "No quiz yet"}</Badge>
              <Badge>{dna.sources.feedbackCount} reactions</Badge>
              <Badge>{dna.sources.collectionCount} owned</Badge>
              {!user && <Badge variant="outline">Saved on this device</Badge>}
            </div>
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="p-6">
              <p className="eyebrow mb-1">Favourite families</p>
              <p className="mb-4 text-xs text-dim">Blended from quiz answers, reactions and your collection.</p>
              <FamilyRadar families={dna.families} />
            </Card>
            <div className="grid gap-5">
              <Card className="p-6">
                <p className="eyebrow mb-4">Favourite notes</p>
                <NoteCloud notes={dna.topNotes} />
              </Card>
              <Card className="p-6">
                <p className="eyebrow mb-4">Avoided notes</p>
                {dna.excludedNotes.length + dna.dislikedNotes.length ? (
                  <div className="flex flex-wrap gap-2">
                    {dna.excludedNotes.map((n) => <Badge key={n} variant="warn">Never: {noteName(n)}</Badge>)}
                    {dna.dislikedNotes.map((n) => <Badge key={n} variant="outline">Not a fan: {noteName(n)}</Badge>)}
                  </div>
                ) : <p className="text-sm text-mist">None. Add some in the editor below.</p>}
              </Card>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <Card className="p-6">
              <p className="eyebrow mb-4">Seasons</p>
              <BarList items={SEASONS.map((s) => ({ label: SEASON_META[s].label, value: dna.seasons[s] }))} />
            </Card>
            <Card className="p-6">
              <p className="eyebrow mb-4">Occasions</p>
              <BarList items={OCCASIONS.map((o) => ({ label: OCCASION_META[o].label, value: dna.occasions[o] }))} />
            </Card>
            <Card className="space-y-6 p-6">
              <div>
                <p className="eyebrow mb-3">Projection</p>
                <div className="flex items-end gap-1.5" aria-label={`Preferred projection: ${STRENGTH_LABELS[dna.projection.strength]}`}>
                  {[1, 2, 3, 4, 5].map((b) => (
                    <span key={b} className={cn("w-full rounded", b <= dna.projection.strength ? "bg-ivory" : "bg-ivory/10")} style={{ height: 8 + b * 7 }} />
                  ))}
                </div>
                <p className="mt-2 text-sm text-parchment">{STRENGTH_LABELS[dna.projection.strength]}</p>
              </div>
              <div>
                <p className="eyebrow mb-3">Typical budget</p>
                <p className="font-display text-3xl text-ivory">{formatPrice(dna.budget.min)}–{formatPrice(dna.budget.max)}</p>
                <p className="text-xs text-mist">
                  {dna.budget.strict ? "Strict ceiling" : "Flexible ceiling"}
                  {dna.budget.typicalOwned ? ` · you typically own around ${formatPrice(dna.budget.typicalOwned)}` : ""}
                </p>
              </div>
            </Card>
          </div>
        </>
      )}

      {(feedback.length > 0 || data.adjustments.softPriceCeiling || data.adjustments.projectionCap || data.adjustments.sweetnessCap) && (
        <Card className="p-6">
          <h2 className="text-3xl text-ivory">What we&apos;ve learned from you</h2>
          <p className="mt-1 text-sm text-mist">Every reaction adjusts your profile transparently. Undo any of them and its effect disappears.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {data.adjustments.softPriceCeiling && <Badge variant="gold">Prefers under ~{formatPrice(data.adjustments.softPriceCeiling)}</Badge>}
            {data.adjustments.sweetnessCap !== null && <Badge variant="gold">Sweetness below {data.adjustments.sweetnessCap}/10</Badge>}
            {data.adjustments.projectionCap && <Badge variant="gold">Projection below {data.adjustments.projectionCap}/10</Badge>}
            {data.adjustments.hiddenCount > 0 && <Badge>{data.adjustments.hiddenCount} hidden</Badge>}
          </div>
          <ul className="mt-5 divide-y divide-ivory/[0.06]">
            {[...feedback].reverse().map((f) => {
              const frag = byId.get(f.fragranceId);
              if (!frag) return null;
              return (
                <li key={`${f.fragranceId}-${f.type}`} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link href={`/fragrance/${frag.slug}`} className="text-sm text-ivory hover:text-champagne-soft">{frag.name}</Link>
                    <span className="text-sm text-dim"> · {frag.brand}</span>
                    <p className="text-xs text-mist">{FEEDBACK_META[f.type as FeedbackType].label}: {FEEDBACK_META[f.type as FeedbackType].effect.toLowerCase()}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => void toggleFeedback(f.fragranceId, f.type)}>
                    <Undo2 /> Undo
                  </Button>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {/* Re-key so the editor resets whenever the saved profile changes. */}
      <PreferenceEditor key={JSON.stringify(profile)} initial={profile ?? defaultProfile()} />
    </div>
  );
}
