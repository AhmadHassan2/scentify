import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/* Badge ─────────────────────────────────────────────────────── */
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-[3px] px-2 py-0.5 text-[0.6875rem] font-medium tracking-wide whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-ivory/[0.07] text-parchment",
        gold: "bg-champagne/[0.08] text-champagne ring-1 ring-champagne/20",
        outline: "ring-1 ring-ivory/15 text-mist",
        demo: "bg-ivory/[0.05] text-dim ring-1 ring-ivory/10 uppercase tracking-[0.14em] text-[0.6rem]",
        warn: "bg-danger/10 text-danger ring-1 ring-danger/25",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

/* Card ──────────────────────────────────────────────────────── */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("surface rounded-2xl", className)} {...props} />;
}

/* Inputs ────────────────────────────────────────────────────── */
export const inputClass =
  "h-11 w-full rounded-[4px] border border-ivory/20 bg-graphite px-4 text-sm text-ivory placeholder:text-dim transition-colors focus:border-ivory focus:outline-none aria-invalid:border-danger";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputClass, className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputClass, "h-auto min-h-24 py-3 leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        inputClass,
        "appearance-none bg-[url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23625b52' stroke-width='2'><path d='m6 9 6 6 6-6'/></svg>\")] bg-[right_1rem_center] bg-no-repeat pr-10 [&>option]:bg-graphite",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-xs font-medium tracking-wide text-mist", className)} {...props} />;
}

/* Skeleton ──────────────────────────────────────────────────── */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden className={cn("skeleton rounded-xl", className)} {...props} />;
}

/* Chip (toggleable pill) ───────────────────────────────────── */
export function Chip({
  selected,
  className,
  children,
  tone,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean; tone?: "gold" | "danger" }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-[4px] border px-3 py-1.5 text-[0.8rem] transition-colors duration-150",
        selected
          ? tone === "danger"
            ? "border-danger bg-danger/[0.08] text-danger"
            : "border-ivory bg-ivory text-ink"
          : "border-ivory/15 text-parchment hover:border-ivory/40",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/* Meter (0–10 dots / bar) ──────────────────────────────────── */
export function Meter({ value, max = 10, className, label }: { value: number; max?: number; className?: string; label?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      role="meter"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-ivory/[0.07]", className)}
    >
      <div
        className="h-full rounded-full bg-ivory transition-[width] duration-700 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* Section heading ─────────────────────────────────────────── */
export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h2 className="text-balance text-3xl leading-tight text-ivory sm:text-4xl">{title}</h2>
        {description && <p className="mt-3 text-sm leading-relaxed text-mist sm:text-[0.95rem]">{description}</p>}
      </div>
      {action}
    </div>
  );
}
