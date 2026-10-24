"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Armchair,
  Ban,
  Briefcase,
  Check,
  Cherry,
  Citrus,
  CloudFog,
  Coffee,
  Cookie,
  Crown,
  Dumbbell,
  Feather,
  Flame,
  Flower,
  Flower2,
  Gem,
  GraduationCap,
  Hourglass,
  Layers,
  Leaf,
  Music,
  Plus,
  Search,
  Shapes,
  Snowflake,
  Sprout,
  Sun,
  Target,
  ThumbsDown,
  TreePine,
  Wallet,
  Waves,
  Wine,
} from "lucide-react";
import {
  FRAGRANCE_FAMILIES,
  OCCASIONS,
  SEASONS,
  type FragranceFamily,
  type Occasion,
  type Season,
} from "@/types/fragrance";
import { DISLIKED_TRAITS, type PreferenceProfile, type VersatilityPreference } from "@/types/preferences";
import { ACCORD_TONES } from "@/components/fragrance/profile-blocks";
import { NOTES, NOTE_BY_ID, noteName } from "@/lib/fragrance/notes";
import {
  DISLIKED_TRAIT_META,
  FAMILY_META,
  LONGEVITY_LABELS,
  OCCASION_META,
  SEASON_META,
  STRENGTH_LABELS,
  formatPrice,
} from "@/lib/fragrance/taxonomy";
import { Input } from "@/components/ui/primitives";
import { Slider, Switch } from "@/components/ui/overlays";
import { cn } from "@/lib/utils";

type Icon = React.ComponentType<{ className?: string; style?: React.CSSProperties; strokeWidth?: number }>;

export interface StepProps {
  profile: PreferenceProfile;
  onChange: (patch: Partial<PreferenceProfile>) => void;
}

/** Optional catalog data the quiz shell provides (e.g. price histogram). */
export const QuizDataContext = React.createContext<{ prices: number[] }>({ prices: [] });

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

export function noteTone(id: string): string {
  return ACCORD_TONES[NOTE_BY_ID[id]?.groups[0] ?? "woody"] ?? "#D8BE8C";
}

/* ── Shared visual building blocks ─────────────────────────────── */

function CheckBadge({ show, tone = "#D8BE8C" }: { show: boolean; tone?: string }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.span
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 18 }}
          className="absolute right-3 top-3 z-10 grid size-6 place-items-center rounded-full text-ink"
          style={{ background: "#1b1916" }}
          aria-hidden
        >
          <Check className="size-3.5" strokeWidth={3} />
        </motion.span>
      )}
    </AnimatePresence>
  );
}

function VisualTile({
  selected,
  onClick,
  title,
  description,
  icon: IconCmp,
  tone,
  chips,
  className,
  children,
  role,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description?: string;
  icon?: Icon;
  tone: string;
  chips?: string[];
  className?: string;
  children?: React.ReactNode;
  role?: "radio";
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      role={role}
      aria-pressed={role ? undefined : selected}
      aria-checked={role ? selected : undefined}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "group relative flex min-h-36 cursor-pointer flex-col items-start overflow-hidden rounded-lg border p-4 text-left transition-colors duration-300 sm:min-h-44 sm:p-5",
        selected ? "border-transparent" : "border-ivory/12 hover:border-ivory/35",
        className,
      )}
      style={{
        background: selected ? `${tone}24` : "var(--color-graphite)",
        boxShadow: selected ? "inset 0 0 0 1.5px #1b1916" : undefined,
      }}
    >
      <CheckBadge show={selected} />
      {IconCmp && (
        <span
          className="relative mb-3 grid size-11 place-items-center rounded-md sm:mb-4 sm:size-12"
          style={{ background: `${tone}38` }}
        >
          <IconCmp className="size-5 text-ivory sm:size-6" />
        </span>
      )}
      {children}
      <span className={cn("relative font-display text-[1.3rem] leading-tight sm:text-[1.6rem]", selected ? "text-ivory" : "text-parchment")}>{title}</span>
      {description && <span className="relative mt-1 line-clamp-2 text-xs leading-relaxed text-mist sm:text-[0.82rem]">{description}</span>}
      {chips && (
        <span className="relative mt-auto hidden flex-wrap gap-1.5 pt-4 sm:flex">
          {chips.map((c) => (
            <span key={c} className="rounded-[3px] px-2 py-0.5 text-[0.68rem] text-mist ring-1 ring-ivory/12">
              {c}
            </span>
          ))}
        </span>
      )}
    </motion.button>
  );
}

/* ── 1 · Budget ─────────────────────────────────────────────────── */

const BUDGET_MAX = 700;
const BIN = 25;

function PriceHistogram({ min, max }: { min: number; max: number }) {
  const { prices } = React.useContext(QuizDataContext);
  if (!prices.length) return null;
  const bins = Array.from({ length: BUDGET_MAX / BIN }, (_, i) => prices.filter((p) => p >= i * BIN && p < (i + 1) * BIN).length);
  bins[bins.length - 1] += prices.filter((p) => p >= BUDGET_MAX).length;
  const peak = Math.max(...bins, 1);
  const inRange = prices.filter((p) => p >= min && (max >= BUDGET_MAX || p <= max)).length;
  return (
    <div>
      <div className="flex h-28 items-end gap-[3px]" aria-hidden>
        {bins.map((count, i) => {
          const lo = i * BIN;
          const active = lo + BIN > min && lo <= max;
          return (
            <motion.div
              key={i}
              className="flex-1 rounded-t-[3px]"
              initial={false}
              animate={{ height: `${Math.max(4, (count / peak) * 100)}%`, opacity: 1 }}
              transition={{ duration: 0.4 }}
              style={{ background: active ? "#1b1916" : "rgb(27 25 22 / 0.14)" }}
            />
          );
        })}
      </div>
      <p className="mt-4 text-center text-sm text-mist" aria-live="polite">
        <motion.span key={inRange} initial={{ scale: 1.15, color: "#7a2e2a" }} animate={{ scale: 1, color: "#1b1916" }} className="inline-block font-display text-3xl">
          {inRange}
        </motion.span>{" "}
        of {prices.length} fragrances fit this range
      </p>
    </div>
  );
}

export function BudgetStep({ profile, onChange }: StepProps) {
  const { min, max, strict } = profile.budget;
  const presets = [
    { label: "Everyday", sub: "Under $80", min: 0, max: 80, tone: "#9FB39A" },
    { label: "Designer", sub: "$80–150", min: 80, max: 150, tone: "#D8BE8C" },
    { label: "Premium", sub: "$150–250", min: 150, max: 250, tone: "#C98B3E" },
    { label: "Niche & luxury", sub: "$250+", min: 250, max: BUDGET_MAX, tone: "#B4703F" },
  ];
  return (
    <div className="space-y-6">
      <div className="surface rounded-lg p-6 sm:p-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-dim">Your range (CAD)</p>
            <p className="mt-1 font-display text-5xl leading-none text-ivory sm:text-6xl">
              {formatPrice(min)}
              <span className="mx-3 text-ash">–</span>
              {max >= BUDGET_MAX ? `${formatPrice(BUDGET_MAX)}+` : formatPrice(max)}
            </p>
          </div>
        </div>
        <PriceHistogram min={min} max={max} />
        <Slider
          className="mt-6"
          min={0}
          max={BUDGET_MAX}
          step={10}
          minStepsBetweenThumbs={2}
          value={[min, max]}
          thumbLabels={["Minimum price", "Maximum price"]}
          onValueChange={([a, b]) => onChange({ budget: { ...profile.budget, min: a, max: b } })}
        />
        <div className="mt-2 flex justify-between text-[0.7rem] text-dim">
          <span>$0</span>
          <span>$350</span>
          <span>$700+</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {presets.map((p) => (
          <VisualTile
            key={p.label}
            className="min-h-32"
            selected={min === p.min && max === p.max}
            onClick={() => onChange({ budget: { ...profile.budget, min: p.min, max: p.max } })}
            title={p.label}
            description={p.sub}
            tone={p.tone}
            icon={Wallet}
          />
        ))}
      </div>
      <label className="flex cursor-pointer items-center gap-4 rounded-lg border border-ivory/10 p-5 transition-colors hover:border-ivory/20">
        <Switch checked={strict} onCheckedChange={(v) => onChange({ budget: { ...profile.budget, strict: v } })} aria-label="Strict maximum budget" />
        <span>
          <span className="block text-ivory">Strict maximum</span>
          <span className="mt-0.5 block text-sm leading-relaxed text-mist">
            {strict ? "Nothing above your maximum will ever be shown." : "Slightly pricier fragrances can still appear if they're an outstanding match."}
          </span>
        </span>
      </label>
    </div>
  );
}

/* ── 2 · Families ───────────────────────────────────────────────── */

export const FAMILY_VISUALS: Record<FragranceFamily, { icon: Icon; notes: string[] }> = {
  citrus: { icon: Citrus, notes: ["Bergamot", "Lemon", "Yuzu"] },
  aquatic: { icon: Waves, notes: ["Sea salt", "Calone", "Driftwood"] },
  aromatic: { icon: Sprout, notes: ["Lavender", "Sage", "Rosemary"] },
  green: { icon: Leaf, notes: ["Violet leaf", "Green tea", "Fig leaf"] },
  floral: { icon: Flower2, notes: ["Rose", "Iris", "Jasmine"] },
  fruity: { icon: Cherry, notes: ["Pineapple", "Apple", "Cassis"] },
  woody: { icon: TreePine, notes: ["Cedar", "Vetiver", "Sandalwood"] },
  spicy: { icon: Flame, notes: ["Pepper", "Cardamom", "Cinnamon"] },
  amber: { icon: Gem, notes: ["Amber", "Labdanum", "Benzoin"] },
  gourmand: { icon: Cookie, notes: ["Vanilla", "Tonka", "Caramel"] },
  leather: { icon: Armchair, notes: ["Suede", "Birch", "Saffron"] },
  smoky: { icon: CloudFog, notes: ["Incense", "Tobacco", "Cade"] },
  musky: { icon: Feather, notes: ["White musk", "Ambrette", "Cashmere"] },
};

export function FamiliesStep({ profile, onChange }: StepProps) {
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
      {FRAGRANCE_FAMILIES.map((f) => (
        <VisualTile
          key={f}
          selected={profile.families.includes(f)}
          onClick={() => onChange({ families: toggle(profile.families, f) })}
          title={FAMILY_META[f].label}
          description={FAMILY_META[f].description}
          tone={FAMILY_META[f].tone}
          icon={FAMILY_VISUALS[f].icon}
          chips={FAMILY_VISUALS[f].notes}
        />
      ))}
    </div>
  );
}

/* ── 3 · Notes ──────────────────────────────────────────────────── */

const NOTE_GROUPS: Array<{ label: string; tone: string; ids: string[] }> = [
  { label: "Fresh & citrus", tone: "#E7C766", ids: ["bergamot", "lemon", "grapefruit", "mandarin", "neroli", "yuzu", "sea_notes", "mint"] },
  { label: "Green & herbal", tone: "#9AAE8C", ids: ["lavender", "sage", "rosemary", "green_tea", "violet_leaf", "fig_leaf", "basil"] },
  { label: "Floral", tone: "#D9A3A8", ids: ["rose", "iris", "jasmine", "orange_blossom", "violet", "magnolia"] },
  { label: "Fruity", tone: "#E39A6B", ids: ["apple", "pineapple", "blackcurrant", "pear", "plum", "fig"] },
  { label: "Spice", tone: "#C46F45", ids: ["pink_pepper", "black_pepper", "cardamom", "ginger", "cinnamon", "saffron", "nutmeg"] },
  { label: "Woods", tone: "#A7825A", ids: ["cedar", "sandalwood", "vetiver", "patchouli", "guaiac_wood", "oud", "cypress"] },
  { label: "Sweet & warm", tone: "#C98B3E", ids: ["vanilla", "tonka_bean", "amber", "honey", "caramel", "coffee", "cacao", "benzoin"] },
  { label: "Dark & smoky", tone: "#8E6B45", ids: ["leather", "suede", "tobacco", "frankincense", "birch_tar", "rum"] },
  { label: "Musks", tone: "#C9BBAA", ids: ["white_musk", "musk", "ambroxan", "ambrette", "cashmere_wood"] },
];

type NoteState = "none" | "liked" | "soft" | "hard";

function NoteOrb({ id, state, onClick, label }: { id: string; state: NoteState; onClick: () => void; label?: string }) {
  const tone = noteTone(id);
  const active = state !== "none";
  const ring = state === "hard" ? "#e08a7a" : tone;
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "relative inline-flex h-11 cursor-pointer items-center gap-2.5 rounded-[4px] border pl-1.5 pr-3.5 text-sm transition-colors duration-150",
        active ? "text-ivory" : "border-ivory/12 bg-graphite text-parchment hover:border-ivory/35",
      )}
      style={active ? { background: `${ring}1f`, borderColor: state === "hard" ? ring : "#1b1916" } : undefined}
    >
      <motion.span
        className="relative grid size-7 place-items-center rounded-[3px]"
        style={{ background: tone }}
        aria-hidden
      >
        <AnimatePresence>
          {state === "liked" && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="grid size-5 place-items-center rounded-full bg-ink/70">
              <Check className="size-3 text-ivory" strokeWidth={3} />
            </motion.span>
          )}
          {state === "soft" && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="grid size-5 place-items-center rounded-full bg-ink/70">
              <ThumbsDown className="size-3 text-ivory" />
            </motion.span>
          )}
          {state === "hard" && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="grid size-5 place-items-center rounded-full bg-ink/70">
              <Ban className="size-3 text-danger" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.span>
      {noteName(id)}
    </motion.button>
  );
}

function NoteSearch({ onPick, exclude, placeholder = "Search all 100+ notes…" }: { onPick: (id: string) => void; exclude: string[]; placeholder?: string }) {
  const [q, setQ] = React.useState("");
  const matches =
    q.trim().length >= 2
      ? NOTES.filter((n) => !exclude.includes(n.id) && (n.name.toLowerCase().includes(q.toLowerCase()) || n.aliases?.some((a) => a.includes(q.toLowerCase())))).slice(0, 8)
      : [];
  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-dim" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} aria-label="Search notes" className="h-12 pl-13 text-base" />
      </div>
      {matches.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {matches.map((n) => (
            <motion.button
              key={n.id}
              type="button"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => {
                onPick(n.id);
                setQ("");
              }}
              className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-[4px] border border-ivory/30 px-4 text-sm text-ivory hover:bg-ivory/[0.04]"
            >
              <Plus className="size-4" /> {n.name}
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}

function NoteGroupCard({ label, tone, children }: { label: string; tone: string; children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-ivory/10 bg-graphite p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="size-2.5 rounded-[2px]" style={{ background: tone }} aria-hidden />
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-mist">{label}</p>
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function NotesStep({ profile, onChange }: StepProps) {
  const blocked = [...profile.excludedNotes, ...profile.dislikedNotes];
  const pick = (id: string) => onChange({ likedNotes: toggle(profile.likedNotes, id) });
  const extra = profile.likedNotes.filter((id) => !NOTE_GROUPS.some((g) => g.ids.includes(id)));
  return (
    <div className="space-y-5">
      <NoteSearch onPick={pick} exclude={[...profile.likedNotes, ...blocked]} />
      {extra.length > 0 && (
        <NoteGroupCard label="Your picks" tone="#D8BE8C">
          {extra.map((id) => (
            <NoteOrb key={id} id={id} state="liked" onClick={() => pick(id)} />
          ))}
        </NoteGroupCard>
      )}
      <div className="grid gap-4 xl:grid-cols-2">
        {NOTE_GROUPS.map((g) => (
          <NoteGroupCard key={g.label} label={g.label} tone={g.tone}>
            {g.ids
              .filter((id) => NOTE_BY_ID[id] && !blocked.includes(id))
              .map((id) => (
                <NoteOrb key={id} id={id} state={profile.likedNotes.includes(id) ? "liked" : "none"} onClick={() => pick(id)} />
              ))}
          </NoteGroupCard>
        ))}
      </div>
    </div>
  );
}

/* ── 4 · Occasions ─────────────────────────────────────────────── */

const OCCASION_VISUALS: Record<Occasion, { icon: Icon; tone: string }> = {
  work: { icon: Briefcase, tone: "#A3B1C2" },
  school: { icon: GraduationCap, tone: "#9FB39A" },
  date: { icon: Wine, tone: "#D99A8F" },
  casual: { icon: Coffee, tone: "#C9A77C" },
  formal: { icon: Crown, tone: "#D8BE8C" },
  gym: { icon: Dumbbell, tone: "#7FB4C9" },
  night_out: { icon: Music, tone: "#B48CC9" },
};

export function OccasionsStep({ profile, onChange }: StepProps) {
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
      {OCCASIONS.map((o) => (
        <VisualTile
          key={o}
          selected={profile.occasions.includes(o)}
          onClick={() => onChange({ occasions: toggle(profile.occasions, o) })}
          title={OCCASION_META[o].label}
          description={OCCASION_META[o].description}
          tone={OCCASION_VISUALS[o].tone}
          icon={OCCASION_VISUALS[o].icon}
        />
      ))}
    </div>
  );
}

/* ── 5 · Seasons ───────────────────────────────────────────────── */

const SEASON_VISUALS: Record<Season, { icon: Icon; description: string; sky: string; tone: string }> = {
  spring: { icon: Flower, description: "Fresh air, blossoms, mild days", sky: "#e3e9d8", tone: "#4f6b45" },
  summer: { icon: Sun, description: "Heat, humidity, long evenings", sky: "#f1e5c8", tone: "#8a6a1f" },
  autumn: { icon: Leaf, description: "Crisp air, layers, woodsmoke", sky: "#eed9c6", tone: "#8f4a22" },
  winter: { icon: Snowflake, description: "Cold, cozy, close to the skin", sky: "#dde4ec", tone: "#3f5a78" },
};

export function SeasonsStep({ profile, onChange }: StepProps) {
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {SEASONS.map((s) => {
        const v = SEASON_VISUALS[s];
        const selected = profile.seasons.includes(s);
        return (
          <motion.button
            key={s}
            type="button"
            onClick={() => onChange({ seasons: toggle(profile.seasons, s) })}
            aria-pressed={selected}
            whileTap={{ scale: 0.98 }}
            className="relative flex min-h-52 cursor-pointer flex-col justify-end overflow-hidden rounded-lg p-4 text-left sm:min-h-64 sm:p-5"
            style={{ background: v.sky, boxShadow: selected ? "inset 0 0 0 1.5px #1b1916" : "inset 0 0 0 1px rgb(27 25 22 / 0.08)" }}
          >
            <CheckBadge show={selected} />
            <motion.span
              className="absolute left-1/2 top-[22%] -translate-x-1/2"
              animate={{ scale: selected ? 1.06 : 1 }}
              transition={{ duration: 0.3 }}
            >
              <v.icon className="size-14" strokeWidth={1.25} style={{ color: v.tone }} />
            </motion.span>
            <span className="relative font-display text-3xl text-ivory">{SEASON_META[s].label}</span>
            <span className="relative mt-1 text-xs leading-relaxed text-mist">{v.description}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

/* ── 6 · Strength (sillage visual) ─────────────────────────────── */

function arrowKeyHandler(value: number, onSelect: (v: number) => void) {
  return (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      onSelect(Math.min(5, value + 1));
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      onSelect(Math.max(1, value - 1));
    }
  };
}

function LevelPicker({
  value,
  onSelect,
  labels,
  descriptions,
  name,
}: {
  value: number;
  onSelect: (v: number) => void;
  labels: Record<number, string>;
  descriptions: string[];
  name: string;
}) {
  return (
    <div role="radiogroup" aria-label={name} onKeyDown={arrowKeyHandler(value, onSelect)} className="grid grid-cols-1 gap-2 sm:grid-cols-5">
      {[1, 2, 3, 4, 5].map((v) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          tabIndex={value === v ? 0 : -1}
          onClick={() => onSelect(v)}
          className={cn(
            "relative flex cursor-pointer items-center gap-4 rounded-2xl border px-4 py-3 text-left transition-all duration-200 sm:block sm:px-3 sm:py-4 sm:text-center",
            value === v ? "border-ivory bg-ivory/[0.05]" : "border-ivory/12 bg-graphite hover:border-ivory/35",
          )}
        >
          <span className="flex h-7 shrink-0 items-end justify-center gap-0.5 sm:mx-auto sm:mb-2" aria-hidden>
            {[1, 2, 3, 4, 5].map((bar) => (
              <span key={bar} className={cn("w-1.5 rounded-full transition-colors", bar <= v ? "bg-ivory" : "bg-ivory/15")} style={{ height: 6 + bar * 4 }} />
            ))}
          </span>
          <span>
            <span className={cn("block font-display text-lg leading-tight", value === v ? "text-ivory" : "text-parchment")}>{labels[v]}</span>
            <span className="mt-0.5 block text-xs text-dim sm:text-[0.7rem]">{descriptions[v - 1]}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

export function StrengthStep({ profile, onChange }: StepProps) {
  const level = profile.strength;
  const descriptions = ["Only you notice it", "Noticed up close", "A pleasant aura", "Noticed across a room", "Leaves an impression"];
  return (
    <div className="space-y-6">
      <div className="surface relative grid h-60 place-items-center overflow-hidden rounded-lg sm:h-72" aria-hidden>
        {[1, 2, 3, 4, 5].map((ring) => (
          <motion.span
            key={ring}
            className="absolute rounded-full border"
            style={{ width: 70 + ring * 52, height: 70 + ring * 52, borderColor: "#1b1916" }}
            animate={
              ring <= level
                ? { opacity: [0.5 - ring * 0.06, 0.15, 0.5 - ring * 0.06], scale: [1, 1.04, 1] }
                : { opacity: 0.06, scale: 0.95 }
            }
            transition={ring <= level ? { duration: 2.6, repeat: Infinity, delay: ring * 0.25, ease: "easeInOut" } : { duration: 0.4 }}
          />
        ))}
        <div className="relative grid size-20 place-items-center rounded-full bg-ivory">
          <span className="font-display text-3xl text-ink">{level}</span>
        </div>
        <p className="absolute bottom-5 font-display text-2xl text-ivory">{STRENGTH_LABELS[level]}</p>
      </div>
      <LevelPicker name="Strength" value={level} onSelect={(v) => onChange({ strength: v })} labels={STRENGTH_LABELS} descriptions={descriptions} />
    </div>
  );
}

/* ── 7 · Longevity (hours timeline) ────────────────────────────── */

const LONGEVITY_HOURS = [1.5, 3, 5, 7, 10];

export function LongevityStep({ profile, onChange }: StepProps) {
  const level = profile.longevityImportance;
  const hours = LONGEVITY_HOURS[level - 1];
  const descriptions = ["I'll reapply", "2–4 hours", "4–6 hours", "6–8 hours", "8+ hours"];
  return (
    <div className="space-y-6">
      <div className="surface rounded-lg p-6 sm:p-8" aria-hidden>
        <div className="mb-6 flex items-center gap-4">
          <motion.span key={level} initial={{ rotate: -180, scale: 0.6 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 14 }}>
            <Hourglass className="size-11 text-ivory" strokeWidth={1.25} />
          </motion.span>
          <div>
            <p className="font-display text-4xl text-ivory">{level === 1 ? "No minimum" : `${hours}+ hours`}</p>
            <p className="text-sm text-mist">{LONGEVITY_LABELS[level]}</p>
          </div>
        </div>
        <div className="relative h-14 overflow-hidden rounded-2xl bg-ivory/[0.05]">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-2xl"
            style={{ background: "#1b1916" }}
            animate={{ width: `${(hours / 12) * 100}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
          <div className="absolute inset-0 grid grid-cols-12">
            {Array.from({ length: 12 }).map((_, i) => (
              <span key={i} className="border-r border-ink/30 last:border-0" />
            ))}
          </div>
        </div>
        <div className="mt-2 flex justify-between text-[0.7rem] text-dim">
          {["Apply", "3h", "6h", "9h", "12h"].map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        <div className="mt-5 flex justify-between text-xs text-mist">
          <span className="flex items-center gap-1.5"><Sun className="size-3.5" /> Morning</span>
          <span className="flex items-center gap-1.5"><Briefcase className="size-3.5" /> Workday</span>
          <span className="flex items-center gap-1.5"><Wine className="size-3.5" /> Evening</span>
        </div>
      </div>
      <LevelPicker name="Longevity importance" value={level} onSelect={(v) => onChange({ longevityImportance: v })} labels={LONGEVITY_LABELS} descriptions={descriptions} />
    </div>
  );
}

/* ── 8 · Versatility ───────────────────────────────────────────── */

function MiniBottles({ count, tones }: { count: number; tones: string[] }) {
  return (
    <span className="relative mb-4 flex h-16 items-end gap-1.5" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="flex flex-col items-center">
          <span className="h-2.5 w-3 rounded-sm bg-champagne/80" />
          <span className="h-1 w-2 bg-ivory/30" />
          <span className="w-8 rounded-md border border-ivory/30" style={{ height: 30 + (i % 2) * 8, background: `linear-gradient(to top, ${tones[i % tones.length]}, ${tones[i % tones.length]}44)` }} />
        </span>
      ))}
    </span>
  );
}

export function VersatilityStep({ profile, onChange }: StepProps) {
  const options: Array<{ v: VersatilityPreference; title: string; description: string; icon: Icon; tone: string; bottles: number; tones: string[] }> = [
    { v: "versatile", title: "One that does it all", description: "A dependable signature for most days and seasons.", icon: Target, tone: "#D8BE8C", bottles: 1, tones: ["#D8BE8C"] },
    { v: "specific", title: "The right tool for the job", description: "Standout scents tailored to particular moments.", icon: Layers, tone: "#C98B3E", bottles: 4, tones: ["#7FB4C9", "#E7C766", "#C46F45", "#8E6B45"] },
    { v: "no_preference", title: "Either works", description: "Show me the best matches regardless.", icon: Shapes, tone: "#9FB39A", bottles: 2, tones: ["#9FB39A", "#D9A3A8"] },
  ];
  return (
    <div role="radiogroup" aria-label="Versatility preference" className="grid gap-3 md:grid-cols-3">
      {options.map((o) => (
        <VisualTile key={o.v} role="radio" className="min-h-64" selected={profile.versatility === o.v} onClick={() => onChange({ versatility: o.v })} title={o.title} description={o.description} tone={o.tone}>
          <MiniBottles count={o.bottles} tones={o.tones} />
        </VisualTile>
      ))}
    </div>
  );
}

/* ── 9 · Dislikes ──────────────────────────────────────────────── */

const DISLIKE_CANDIDATES = ["oud", "tobacco", "leather", "birch_tar", "patchouli", "vanilla", "caramel", "musk", "cumin", "frankincense", "tuberose", "coconut", "calone", "lavender", "rose", "coffee", "honey", "smoked_tea"];

/** Tap cycles: neutral → not a fan (soft) → never (hard) → neutral. */
export function DislikesStep({ profile, onChange }: StepProps) {
  const state = (id: string): NoteState =>
    profile.excludedNotes.includes(id) ? "hard" : profile.dislikedNotes.includes(id) ? "soft" : "none";
  const cycle = (id: string) => {
    const s = state(id);
    const disliked = profile.dislikedNotes.filter((x) => x !== id);
    const excluded = profile.excludedNotes.filter((x) => x !== id);
    if (s === "none") onChange({ dislikedNotes: [...disliked, id], excludedNotes: excluded, likedNotes: profile.likedNotes.filter((x) => x !== id) });
    else if (s === "soft") onChange({ dislikedNotes: disliked, excludedNotes: [...excluded, id] });
    else onChange({ dislikedNotes: disliked, excludedNotes: excluded });
  };
  const ids = [...new Set([...DISLIKE_CANDIDATES, ...profile.dislikedNotes, ...profile.excludedNotes])];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-lg border border-ivory/12 bg-graphite p-4">
          <ThumbsDown className="size-5 shrink-0 text-ivory" />
          <p className="text-sm text-parchment"><span className="text-ivory">Tap once — not a fan.</span> Ranked lower, still allowed.</p>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-danger/30 bg-graphite p-4">
          <Ban className="size-5 shrink-0 text-danger" />
          <p className="text-sm text-parchment"><span className="text-ivory">Tap twice — never.</span> Removed from every result.</p>
        </div>
      </div>
      <NoteSearch onPick={cycle} exclude={ids} placeholder="Search a note to avoid…" />
      <NoteGroupCard label="Common dealbreakers" tone="#e08a7a">
        {ids.map((id) => {
          const s = state(id);
          return (
            <NoteOrb
              key={id}
              id={id}
              state={s}
              onClick={() => cycle(id)}
              label={`${noteName(id)}: ${s === "hard" ? "never" : s === "soft" ? "not a fan" : "no preference"}`}
            />
          );
        })}
      </NoteGroupCard>
      <NoteGroupCard label="Characteristics to go easy on" tone="#D8BE8C">
        {DISLIKED_TRAITS.map((t) => {
          const on = profile.dislikedTraits.includes(t);
          return (
            <motion.button
              key={t}
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={() => onChange({ dislikedTraits: toggle(profile.dislikedTraits, t) })}
              aria-pressed={on}
              className={cn(
                "inline-flex h-11 cursor-pointer items-center gap-2 rounded-[4px] border px-4 text-sm transition-colors",
                on ? "border-ivory bg-ivory text-ink" : "border-ivory/12 bg-graphite text-parchment hover:border-ivory/35",
              )}
            >
              {on && <Check className="size-4" />}
              {DISLIKED_TRAIT_META[t].label}
            </motion.button>
          );
        })}
      </NoteGroupCard>
    </div>
  );
}

/* ── Step registry ─────────────────────────────────────────────── */

export const QUIZ_STEPS: Array<{
  id: string;
  short: string;
  title: string;
  subtitle: string;
  icon: Icon;
  Component: React.ComponentType<StepProps>;
  multi?: boolean;
}> = [
  { id: "budget", short: "Budget", icon: Wallet, title: "What's your budget?", subtitle: "Drag the range and watch how many fragrances fit.", Component: BudgetStep },
  { id: "families", short: "Families", icon: Flower2, title: "Which scent families draw you in?", subtitle: "Pick as many as you like — your bottle takes on their colour.", Component: FamiliesStep, multi: true },
  { id: "notes", short: "Notes", icon: Sprout, title: "Any notes you love?", subtitle: "Tap ingredients you're drawn to. They'll float around your bottle.", Component: NotesStep, multi: true },
  { id: "occasions", short: "Occasions", icon: Briefcase, title: "Where will you wear it?", subtitle: "Select every occasion that matters.", Component: OccasionsStep, multi: true },
  { id: "seasons", short: "Seasons", icon: Sun, title: "Which seasons?", subtitle: "When do you most want to wear it?", Component: SeasonsStep, multi: true },
  { id: "strength", short: "Strength", icon: Waves, title: "How far should it carry?", subtitle: "From a secret skin scent to a room-filling statement.", Component: StrengthStep },
  { id: "longevity", short: "Longevity", icon: Hourglass, title: "How long should it last?", subtitle: "How much of the day before a touch-up?", Component: LongevityStep },
  { id: "versatility", short: "Style", icon: Layers, title: "One signature, or a wardrobe?", subtitle: "A do-everything scent, or specialists for each moment.", Component: VersatilityStep },
  { id: "dislikes", short: "Dislikes", icon: Ban, title: "Anything you'd rather avoid?", subtitle: "Mark notes you're not a fan of, or ones you never want to smell.", Component: DislikesStep },
];
