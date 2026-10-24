"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { GitCompareArrows, Heart } from "lucide-react";
import type { FragranceSummary } from "@/types/fragrance";
import { useApp } from "@/components/providers/app-provider";
import { FAMILY_META, formatPrice } from "@/lib/fragrance/taxonomy";
import { noteName } from "@/lib/fragrance/notes";
import { cn } from "@/lib/utils";
import { BottleStage } from "./bottle";
import { MatchBadge } from "./match-badge";

export function FragranceCard({
  fragrance: f,
  matchPercent,
  reason,
  footer,
  priority,
  className,
}: {
  fragrance: FragranceSummary;
  matchPercent?: number | null;
  reason?: string;
  footer?: React.ReactNode;
  priority?: boolean;
  className?: string;
}) {
  const { wishlistIds, compareIds, toggleWishlist, toggleCompare, collectionIds } = useApp();
  const saved = wishlistIds.has(f.id);
  const comparing = compareIds.includes(f.id);
  const owned = collectionIds.has(f.id);
  const family = FAMILY_META[f.families[0]];

  return (
    <motion.article
      initial={priority ? false : { opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "group surface relative flex flex-col overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:border-champagne/25 hover:shadow-[var(--shadow-glow)]",
        className,
      )}
    >
      <Link href={`/fragrance/${f.slug}`} className="relative block aspect-[4/4.2] outline-none" aria-label={`${f.name} by ${f.brand}`}>
        <BottleStage
          visual={f.visual}
          brand={f.brand}
          name={f.name}
          tone={family.tone}
          className="absolute inset-0"
          bottleClassName="transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {typeof matchPercent === "number" && <MatchBadge value={matchPercent} />}
          {owned && (
            <span className="rounded-full bg-sage/20 px-2.5 py-1 text-[0.65rem] font-medium text-sage ring-1 ring-sage/30">In collection</span>
          )}
        </div>
      </Link>

      <div className="absolute right-3 top-3 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => toggleWishlist(f.id, f.name)}
          aria-pressed={saved}
          aria-label={saved ? `Remove ${f.name} from wishlist` : `Save ${f.name} to wishlist`}
          className={cn(
            "grid size-9 cursor-pointer place-items-center rounded-full bg-ink/70 ring-1 transition-colors",
            saved ? "text-rose ring-rose/40" : "text-mist ring-ivory/10 hover:text-ivory",
          )}
        >
          <Heart className={cn("size-4", saved && "fill-current")} />
        </button>
        <button
          type="button"
          onClick={() => toggleCompare(f.id)}
          aria-pressed={comparing}
          aria-label={comparing ? `Remove ${f.name} from comparison` : `Add ${f.name} to comparison`}
          className={cn(
            "grid size-9 cursor-pointer place-items-center rounded-full bg-ink/70 ring-1 transition-colors",
            comparing ? "text-champagne ring-champagne/50" : "text-mist ring-ivory/10 hover:text-ivory",
          )}
        >
          <GitCompareArrows className="size-4" />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-dim">{f.brand}</p>
          <span className="shrink-0 text-[0.68rem] text-dim">{f.concentration}</span>
        </div>
        <Link href={`/fragrance/${f.slug}`} className="mt-1.5 outline-none">
          <h3 className="font-display text-[1.4rem] leading-tight text-ivory transition-colors group-hover:text-champagne-soft">{f.name}</h3>
        </Link>
        <p className="mt-1.5 line-clamp-1 text-xs text-mist">
          {family.label} · {f.topNotes.slice(0, 3).map(noteName).join(", ")}
        </p>
        {reason && <p className="mt-3 line-clamp-3 text-[0.8rem] leading-relaxed text-parchment/85">{reason}</p>}
        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <div>
            <p className="text-base text-ivory">
              {formatPrice(f.priceFrom, f.currency)}
              <span className="ml-1 text-xs font-normal text-dim">/ {f.priceFromSizeMl} ml</span>
            </p>
            {f.isSynthetic && <p className="text-[0.6rem] uppercase tracking-[0.14em] text-dim">Demo price</p>}
          </div>
          <div className="text-right text-[0.68rem] leading-relaxed text-dim">
            <div>Longevity {f.longevity}/10</div>
            <div>Projection {f.projection}/10</div>
          </div>
        </div>
        {footer && <div className="mt-4 border-t border-ivory/[0.07] pt-4">{footer}</div>}
      </div>
    </motion.article>
  );
}

export function FragranceCardSkeleton() {
  return (
    <div className="surface overflow-hidden rounded-2xl" aria-hidden>
      <div className="skeleton aspect-[4/4.2] rounded-none" />
      <div className="space-y-2.5 p-5">
        <div className="skeleton h-3 w-24 rounded" />
        <div className="skeleton h-6 w-40 rounded" />
        <div className="skeleton h-3 w-32 rounded" />
        <div className="skeleton mt-6 h-5 w-20 rounded" />
      </div>
    </div>
  );
}

export function FragranceGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4", className)}>{children}</div>;
}
