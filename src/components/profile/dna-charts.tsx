import type { FragranceFamily } from "@/types/fragrance";
import { noteName } from "@/lib/fragrance/notes";
import { FAMILY_META } from "@/lib/fragrance/taxonomy";

/** Radar chart of family affinity. Pure SVG, scales to its container. */
export function FamilyRadar({ families }: { families: Array<{ family: FragranceFamily; score: number }> }) {
  const order = [...families].sort((a, b) => a.family.localeCompare(b.family));
  const n = order.length;
  const cx = 160;
  const cy = 160;
  const R = 112;
  const point = (i: number, r: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as const;
  };
  const poly = order.map((f, i) => point(i, R * Math.max(0.04, f.score)).join(",")).join(" ");
  const top = [...families].sort((a, b) => b.score - a.score).slice(0, 3).map((f) => FAMILY_META[f.family].label);

  return (
    <figure>
      <svg viewBox="0 0 320 320" className="mx-auto w-full max-w-sm" role="img" aria-label={`Family affinity radar. Strongest: ${top.join(", ")}.`}>
        {[0.25, 0.5, 0.75, 1].map((r) => (
          <polygon key={r} points={order.map((_, i) => point(i, R * r).join(",")).join(" ")} fill="none" stroke="rgb(27 25 22 / 0.12)" />
        ))}
        {order.map((_, i) => {
          const [x, y] = point(i, R);
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgb(27 25 22 / 0.08)" />;
        })}
        <polygon points={poly} fill="rgb(122 46 42 / 0.1)" stroke="#7a2e2a" strokeWidth="1.5" strokeLinejoin="round" />
        {order.map((f, i) => {
          const [x, y] = point(i, R * Math.max(0.04, f.score));
          return <circle key={f.family} cx={x} cy={y} r={f.score > 0.05 ? 3 : 0} fill="#7a2e2a" />;
        })}
        {order.map((f, i) => {
          const [x, y] = point(i, R + 22);
          return (
            <text key={f.family} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="9.5" fill={f.score >= 0.5 ? "#1b1916" : "#736b61"} fontFamily="var(--font-sans)">
              {FAMILY_META[f.family].label.replace("Sweet & ", "")}
            </text>
          );
        })}
      </svg>
    </figure>
  );
}

export function NoteCloud({ notes }: { notes: Array<{ id: string; score: number }> }) {
  if (!notes.length) return <p className="text-sm text-mist">Pick notes you love in the quiz, or react to fragrances, and they&apos;ll appear here.</p>;
  const max = Math.max(...notes.map((n) => n.score));
  return (
    <ul className="flex flex-wrap items-center gap-2" aria-label="Favourite notes, largest are strongest">
      {notes.map((n) => {
        const w = n.score / max;
        return (
          <li
            key={n.id}
            className="rounded-full border border-champagne/25 bg-champagne/[0.06] px-3 py-1 font-display text-champagne-soft"
            style={{ fontSize: `${0.85 + w * 0.75}rem`, opacity: 0.55 + w * 0.45 }}
          >
            {noteName(n.id)}
          </li>
        );
      })}
    </ul>
  );
}

export function BarList({ items }: { items: Array<{ label: string; value: number }> }) {
  return (
    <ul className="space-y-2.5">
      {items.map((i) => (
        <li key={i.label} className="grid grid-cols-[5.5rem_1fr] items-center gap-3 text-xs text-mist">
          {i.label}
          <div className="h-2 overflow-hidden rounded-full bg-ivory/[0.06]" role="meter" aria-label={i.label} aria-valuenow={Math.round(i.value * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-ivory" style={{ width: `${Math.round(i.value * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
