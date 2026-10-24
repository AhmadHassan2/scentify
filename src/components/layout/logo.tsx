import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("group inline-flex items-center gap-2.5 outline-none", className)} aria-label="Scentify home">
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden>
        <defs>
          <linearGradient id="logoGold" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#1b1916" />
            <stop offset="1" stopColor="#1b1916" />
          </linearGradient>
        </defs>
        <rect x="12" y="3" width="8" height="5" rx="1.2" fill="url(#logoGold)" />
        <rect x="14" y="8" width="4" height="3" fill="url(#logoGold)" opacity="0.6" />
        <path d="M9 13.5Q9 11 11.5 11h9Q23 11 23 13.5V26q0 3-3 3h-8q-3 0-3-3Z" fill="none" stroke="url(#logoGold)" strokeWidth="1.6" />
        <path d="M10.2 19h11.6V26q0 1.8-1.8 1.8h-8q-1.8 0-1.8-1.8Z" fill="url(#logoGold)" opacity="0.35" />
      </svg>
      <span className="font-display text-[1.45rem] tracking-tight text-ivory">
        Scent<span className="gold-text">ify</span>
      </span>
    </Link>
  );
}
