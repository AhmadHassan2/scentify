import Link from "next/link";
import { Logo } from "./logo";

const COLUMNS = [
  {
    title: "Discover",
    links: [
      { href: "/quiz", label: "Fragrance quiz" },
      { href: "/discover", label: "Discovery mode" },
      { href: "/fragrances", label: "Browse catalog" },
      { href: "/budget", label: "Budget finder" },
    ],
  },
  {
    title: "Your scent",
    links: [
      { href: "/today", label: "What to wear today" },
      { href: "/profile", label: "Fragrance DNA" },
      { href: "/collection", label: "My collection" },
      { href: "/wishlist", label: "Wishlist" },
    ],
  },
  {
    title: "Scentify",
    links: [
      { href: "/chat", label: "Fragrance assistant" },
      { href: "/compare", label: "Compare" },
      { href: "/about", label: "How matching works" },
      { href: "/about#data", label: "About the demo data" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-ivory/[0.07] bg-charcoal/60">
      <div className="page-container grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-4 text-sm leading-relaxed text-mist">
            Personal fragrance discovery powered by our own recommendation engine, built on structured scent data.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="eyebrow mb-4">{col.title}</p>
            <ul className="space-y-2.5">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-mist transition-colors hover:text-ivory">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-ivory/[0.06]">
        <div className="page-container flex flex-col gap-2 py-6 text-xs leading-relaxed text-dim sm:flex-row sm:justify-between">
          <p>
            All brands, fragrances, ratings and prices shown are <strong className="font-medium text-mist">fictional demonstration data</strong>.
            Match scores are algorithmic compatibility estimates, not guarantees.
          </p>
          <p className="shrink-0">© {new Date().getFullYear()} Scentify</p>
        </div>
      </div>
    </footer>
  );
}
