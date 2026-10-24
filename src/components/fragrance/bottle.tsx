import * as React from "react";
import type { BottleShape, BottleVisual } from "@/types/fragrance";
import { cn } from "@/lib/utils";

/**
 * Self-drawn, generic bottle illustration. Used instead of product photos so
 * the fictional demo catalog never borrows real brands' imagery.
 */

interface ShapeSpec {
  body: string;
  /** y coordinate where the liquid starts (lower = fuller). */
  liquidTop: number;
  /** Vertical extent of the glass body, used for animated fill levels. */
  bodyTop: number;
  bodyBottom: number;
  neck: { x: number; y: number; w: number; h: number };
  cap: { x: number; y: number; w: number; h: number; r: number };
  label: { x: number; y: number; w: number; h: number };
}

const SHAPES: Record<BottleShape, ShapeSpec> = {
  tall: {
    body: "M58 86 Q58 74 70 74 H130 Q142 74 142 86 V226 Q142 240 128 240 H72 Q58 240 58 226 Z",
    liquidTop: 112,
    bodyTop: 74,
    bodyBottom: 240,
    neck: { x: 88, y: 60, w: 24, h: 16 },
    cap: { x: 80, y: 22, w: 40, h: 40, r: 5 },
    label: { x: 74, y: 150, w: 52, h: 46 },
  },
  square: {
    body: "M42 104 Q42 92 54 92 H146 Q158 92 158 104 V224 Q158 238 144 238 H56 Q42 238 42 224 Z",
    liquidTop: 128,
    bodyTop: 92,
    bodyBottom: 238,
    neck: { x: 86, y: 78, w: 28, h: 16 },
    cap: { x: 70, y: 36, w: 60, h: 44, r: 4 },
    label: { x: 66, y: 156, w: 68, h: 44 },
  },
  round: {
    body: "M100 92 C146 92 166 128 166 166 C166 208 136 240 100 240 C64 240 34 208 34 166 C34 128 54 92 100 92 Z",
    liquidTop: 132,
    bodyTop: 92,
    bodyBottom: 240,
    neck: { x: 88, y: 76, w: 24, h: 18 },
    cap: { x: 76, y: 32, w: 48, h: 46, r: 23 },
    label: { x: 70, y: 160, w: 60, h: 40 },
  },
  flask: {
    body: "M74 84 H126 Q134 84 136 94 L150 130 Q154 140 154 152 V224 Q154 240 138 240 H62 Q46 240 46 224 V152 Q46 140 50 130 L64 94 Q66 84 74 84 Z",
    liquidTop: 136,
    bodyTop: 84,
    bodyBottom: 240,
    neck: { x: 86, y: 68, w: 28, h: 18 },
    cap: { x: 82, y: 30, w: 36, h: 40, r: 6 },
    label: { x: 68, y: 162, w: 64, h: 44 },
  },
  obelisk: {
    body: "M78 80 H122 L150 230 Q152 240 140 240 H60 Q48 240 50 230 Z",
    liquidTop: 120,
    bodyTop: 80,
    bodyBottom: 240,
    neck: { x: 89, y: 64, w: 22, h: 18 },
    cap: { x: 84, y: 18, w: 32, h: 48, r: 2 },
    label: { x: 70, y: 166, w: 60, h: 40 },
  },
  cylinder: {
    body: "M62 92 Q62 82 100 82 Q138 82 138 92 V228 Q138 240 100 240 Q62 240 62 228 Z",
    liquidTop: 118,
    bodyTop: 82,
    bodyBottom: 240,
    neck: { x: 90, y: 66, w: 20, h: 18 },
    cap: { x: 76, y: 22, w: 48, h: 46, r: 24 },
    label: { x: 72, y: 150, w: 56, h: 50 },
  },
};

function initials(brand: string) {
  return brand
    .replace(/&/g, " ")
    .split(/\s+/)
    .filter((w) => w && w[0] === w[0].toUpperCase())
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
}

export function Bottle({
  visual,
  brand,
  name,
  className,
  title,
  fill,
}: {
  visual: BottleVisual;
  brand: string;
  name: string;
  className?: string;
  title?: string;
  /** 0–1 liquid level; animates when it changes. Defaults to the shape's resting level. */
  fill?: number;
}) {
  const uid = React.useId().replace(/:/g, "");
  const s = SHAPES[visual.shape] ?? SHAPES.tall;
  const height = s.bodyBottom - s.bodyTop;
  const liquidOffset = fill === undefined ? s.liquidTop - s.bodyTop : (1 - Math.max(0, Math.min(1, fill))) * height;
  const darkCap = parseInt(visual.cap.slice(1, 3), 16) < 110;

  return (
    <svg
      viewBox="0 0 200 260"
      role="img"
      aria-label={title ?? `Illustrated bottle of ${name} by ${brand}`}
      className={cn("h-full w-full", className)}
    >
      <defs>
        <linearGradient id={`glass-${uid}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={visual.glass} stopOpacity="0.22" />
          <stop offset="0.5" stopColor={visual.glass} stopOpacity="0.08" />
          <stop offset="1" stopColor={visual.glass} stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id={`liquid-${uid}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={visual.liquid} stopOpacity="0.95" style={{ transition: "stop-color 600ms" }} />
          <stop offset="1" stopColor={visual.liquid} stopOpacity="0.62" style={{ transition: "stop-color 600ms" }} />
        </linearGradient>
        <linearGradient id={`cap-${uid}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={visual.cap} />
          <stop offset="0.45" stopColor={visual.cap} stopOpacity="0.75" />
          <stop offset="0.55" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="0.65" stopColor={visual.cap} stopOpacity="0.85" />
          <stop offset="1" stopColor={visual.cap} />
        </linearGradient>
        <radialGradient id={`shadow-${uid}`}>
          <stop offset="0" stopColor="#000" stopOpacity="0.55" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`clip-${uid}`}>
          <path d={s.body} />
        </clipPath>
      </defs>

      <ellipse cx="100" cy="246" rx="70" ry="9" fill={`url(#shadow-${uid})`} />

      {/* neck & cap */}
      <rect x={s.neck.x} y={s.neck.y} width={s.neck.w} height={s.neck.h} rx="3" fill={visual.glass} fillOpacity="0.35" />
      <rect x={s.cap.x} y={s.cap.y} width={s.cap.w} height={s.cap.h} rx={s.cap.r} fill={`url(#cap-${uid})`} />
      <rect x={s.cap.x + 3} y={s.cap.y + 3} width="3" height={s.cap.h - 6} rx="1.5" fill="#fff" fillOpacity={darkCap ? 0.18 : 0.35} />

      {/* glass body */}
      <path d={s.body} fill={`url(#glass-${uid})`} stroke="#1b1916" strokeOpacity="0.22" strokeWidth="1.25" />
      <g clipPath={`url(#clip-${uid})`}>
        <g style={{ transform: `translateY(${liquidOffset}px)`, transition: "transform 900ms cubic-bezier(0.22,1,0.36,1)" }}>
          <rect x="0" y={s.bodyTop} width="200" height={height + 20} fill={`url(#liquid-${uid})`} style={{ transition: "fill 600ms" }} />
          <rect x="0" y={s.bodyTop} width="200" height="3" fill="#fff" fillOpacity="0.25" />
        </g>
        {/* reflections */}
        <rect x="52" y="60" width="12" height="200" fill="#fff" fillOpacity="0.14" transform="skewX(-8)" />
        <rect x="70" y="60" width="4" height="200" fill="#fff" fillOpacity="0.1" transform="skewX(-8)" />
      </g>

      {/* label */}
      <rect x={s.label.x} y={s.label.y} width={s.label.w} height={s.label.h} rx="2" fill="#f4efe6" fillOpacity="0.9" />
      <rect x={s.label.x + 3} y={s.label.y + 3} width={s.label.w - 6} height={s.label.h - 6} rx="1" fill="none" stroke={visual.accent} strokeOpacity="0.7" strokeWidth="0.75" />
      <text
        x="100"
        y={s.label.y + s.label.h / 2 + 2}
        textAnchor="middle"
        fontFamily="Georgia, serif"
        fontSize="15"
        letterSpacing="2"
        fill="#1b1917"
      >
        {initials(brand)}
      </text>
      <text x="100" y={s.label.y + s.label.h - 8} textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="4.6" letterSpacing="1.4" fill="#1b1917" fillOpacity="0.7">
        {name.toUpperCase().slice(0, 22)}
      </text>
    </svg>
  );
}

/** Bottle on a softly lit, family-tinted stage. */
export function BottleStage({
  visual,
  brand,
  name,
  tone,
  className,
  bottleClassName,
}: {
  visual: BottleVisual;
  brand: string;
  name: string;
  tone?: string;
  className?: string;
  bottleClassName?: string;
}) {
  return (
    <div
      className={cn("grain relative isolate overflow-hidden", className)}
      style={{
        background: `radial-gradient(110% 80% at 50% 35%, ${tone ?? visual.liquid}2b 0%, transparent 65%), #ebe5da`,
      }}
    >
      <div className={cn("absolute inset-0 flex items-end justify-center p-[8%]", bottleClassName)}>
        <Bottle visual={visual} brand={brand} name={name} />
      </div>
    </div>
  );
}
