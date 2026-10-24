import type { PreferenceProfile } from "@/types/preferences";
import { noteName } from "@/lib/fragrance/notes";
import { FAMILY_META, OCCASION_META, SEASON_META, STRENGTH_LABELS, formatPrice } from "@/lib/fragrance/taxonomy";
import { Badge } from "@/components/ui/primitives";

export function ProfileSummary({ profile }: { profile: PreferenceProfile }) {
  const items: Array<{ label: string; value: React.ReactNode }> = [
    {
      label: "Budget",
      value: `${formatPrice(profile.budget.min)} – ${formatPrice(profile.budget.max)}${profile.budget.strict ? " (strict)" : ""}`,
    },
    { label: "Families", value: profile.families.map((f) => FAMILY_META[f].label).join(", ") || "Open to all" },
    { label: "Occasions", value: profile.occasions.map((o) => OCCASION_META[o].label).join(", ") || "Any" },
    { label: "Seasons", value: profile.seasons.map((s) => SEASON_META[s].label).join(", ") || "Any" },
    { label: "Strength", value: STRENGTH_LABELS[profile.strength] },
  ];
  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((i) => (
          <div key={i.label}>
            <dt className="text-[0.68rem] uppercase tracking-[0.14em] text-dim">{i.label}</dt>
            <dd className="mt-1 text-sm text-parchment">{i.value}</dd>
          </div>
        ))}
      </dl>
      {(profile.likedNotes.length > 0 || profile.excludedNotes.length > 0 || profile.dislikedNotes.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {profile.likedNotes.map((n) => (
            <Badge key={n} variant="gold">♥ {noteName(n)}</Badge>
          ))}
          {profile.dislikedNotes.map((n) => (
            <Badge key={n} variant="outline">Less {noteName(n)}</Badge>
          ))}
          {profile.excludedNotes.map((n) => (
            <Badge key={n} variant="warn">No {noteName(n)}</Badge>
          ))}
        </div>
      )}
    </div>
  );
}
