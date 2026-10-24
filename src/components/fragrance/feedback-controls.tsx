"use client";

import { Candy, Check, EyeOff, Heart, Volume2, Wallet } from "lucide-react";
import type { FeedbackType } from "@/types/preferences";
import { useApp } from "@/components/providers/app-provider";
import { Tooltip } from "@/components/ui/overlays";
import { FEEDBACK_META } from "@/lib/recommendation/feedback";
import { cn } from "@/lib/utils";

const ICONS: Record<FeedbackType, React.ComponentType<{ className?: string }>> = {
  love: Heart,
  not_interested: EyeOff,
  own: Check,
  too_expensive: Wallet,
  too_sweet: Candy,
  too_strong: Volume2,
};

const ORDER: FeedbackType[] = ["love", "not_interested", "own", "too_expensive", "too_sweet", "too_strong"];

export function FeedbackControls({
  fragranceId,
  name,
  compact,
  types = ORDER,
}: {
  fragranceId: string;
  name: string;
  compact?: boolean;
  types?: FeedbackType[];
}) {
  const { hasFeedback, toggleFeedback, user, updateCollection, collectionIds } = useApp();

  const onClick = async (type: FeedbackType) => {
    const active = hasFeedback(fragranceId, type);
    await toggleFeedback(fragranceId, type);
    // "Already own it" also places it on the signed-in user's shelf.
    if (type === "own" && !active && user && !collectionIds.has(fragranceId)) {
      await updateCollection(fragranceId, "upsert", {}, name);
    }
  };

  return (
    <div role="group" aria-label={`Feedback for ${name}`} className="flex flex-wrap gap-1.5">
      {types.map((type) => {
        const Icon = ICONS[type];
        const active = hasFeedback(fragranceId, type);
        const meta = FEEDBACK_META[type];
        return (
          <Tooltip key={type} content={meta.effect}>
            <button
              type="button"
              onClick={() => void onClick(type)}
              aria-pressed={active}
              aria-label={compact ? meta.label : undefined}
              className={cn(
                "inline-flex cursor-pointer items-center gap-1.5 rounded-full border text-xs transition-colors",
                compact ? "size-8 justify-center" : "px-3 py-1.5",
                active
                  ? type === "love"
                    ? "border-rose/40 bg-rose/12 text-rose"
                    : "border-champagne/50 bg-champagne/12 text-champagne-soft"
                  : "border-ivory/10 text-mist hover:border-ivory/25 hover:text-ivory",
              )}
            >
              <Icon className={cn("size-3.5", active && type === "love" && "fill-current")} />
              {!compact && meta.label}
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}
