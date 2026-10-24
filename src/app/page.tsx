import Link from "next/link";
import {
  ArrowRight,
  CloudSun,
  Dna,
  GitCompareArrows,
  MessageCircle,
  Compass,
  Wallet,
} from "lucide-react";
import type { Fragrance } from "@/types/fragrance";
import { Bottle } from "@/components/fragrance/bottle";
import { FragranceCard, FragranceGrid } from "@/components/fragrance/fragrance-card";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/primitives";
import { getCatalog } from "@/lib/database/catalog";
import { NOTES } from "@/lib/fragrance/notes";
import { toSummary } from "@/lib/fragrance/utils";
import { DEFAULT_WEIGHTS } from "@/lib/recommendation/config";

export const revalidate = 3600;

/** One standout per family, highest rated first — a varied, curated shelf. */
function featured(catalog: Fragrance[], count = 8): Fragrance[] {
  const byFamily = new Map<string, Fragrance>();
  for (const f of [...catalog].sort((a, b) => b.rating - a.rating || a.slug.localeCompare(b.slug))) {
    if (!byFamily.has(f.families[0])) byFamily.set(f.families[0], f);
  }
  return [...byFamily.values()].slice(0, count);
}

const FEATURES = [
  { href: "/today", icon: CloudSun, title: "What should I wear today?", body: "Live weather, the occasion and time of day, matched against your own shelf." },
  { href: "/budget", icon: Wallet, title: "Budget Finder", body: "Hard price ceilings, bottle sizes and filters, ranked by how well each fits you." },
  { href: "/discover", icon: Compass, title: "Discovery Mode", body: "Hidden gems and thoughtful departures, balanced between novelty and taste." },
  { href: "/chat", icon: MessageCircle, title: "Fragrance Assistant", body: "Ask in plain language. Every answer comes from real catalog records." },
  { href: "/compare", icon: GitCompareArrows, title: "Side-by-side compare", body: "Notes, seasons, performance and price for up to three fragrances." },
  { href: "/profile", icon: Dna, title: "Fragrance DNA", body: "A living portrait of your taste that sharpens with every reaction." },
];

const WEIGHT_LABELS: Record<keyof typeof DEFAULT_WEIGHTS, string> = {
  scent: "Scent preferences",
  occasion: "Occasion fit",
  budget: "Budget fit",
  season: "Season fit",
  strength: "Strength & projection",
};

export default async function HomePage() {
  const catalog = await getCatalog();
  const picks = featured(catalog);
  const hero = [picks[0], picks[3], picks[5]].filter(Boolean);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="page-container grid items-center gap-12 pb-20 pt-12 sm:pt-16 lg:grid-cols-[1.1fr_1fr] lg:pb-28 lg:pt-20">
          <div>
            <p className="eyebrow mb-6">Personal fragrance discovery</p>
            <h1 className="text-balance text-[2.9rem] leading-[1.02] text-ivory sm:text-6xl lg:text-[4.6rem]">
              Find the fragrance that&apos;s unmistakably you.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-mist sm:text-lg">
              Tell us what you love, what you avoid and how you live. Scentify scores every fragrance against your taste, budget, climate and
              calendar, and shows you exactly why each one made the cut.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/quiz">
                  Find your scent <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/discover">Explore discovery</Link>
              </Button>
            </div>
            <dl className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-ivory/[0.08] pt-6">
              {[
                { k: "Fragrances", v: catalog.length },
                { k: "Notes mapped", v: NOTES.length },
                { k: "Minutes to match", v: "2" },
              ].map((s) => (
                <div key={s.k}>
                  <dt className="text-[0.7rem] uppercase tracking-[0.14em] text-dim">{s.k}</dt>
                  <dd className="mt-1 font-display text-3xl text-ivory">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative mx-auto aspect-square w-full max-w-[34rem] rounded-lg bg-charcoal" aria-hidden>
            <div className="absolute inset-x-[8%] bottom-[12%] h-px bg-ivory/25" />
            {hero.map((f, i) => (
              <div
                key={f.id}
                className="absolute bottom-[12%]"
                style={{
                  left: ["30%", "4%", "58%"][i],
                  width: ["40%", "32%", "32%"][i],
                  height: ["72%", "56%", "58%"][i],
                  zIndex: i === 0 ? 2 : 1,
                  opacity: 1,
                }}
              >
                <Bottle visual={f.visual} brand={f.brand} name={f.name} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-ivory/[0.06] bg-charcoal/50 py-20">
        <div className="page-container">
          <SectionHeading
            eyebrow="How it works"
            title="Not a chatbot guessing. A matching engine reasoning."
            description="Every fragrance is described by structured notes, accords, performance and suitability. Our own engine scores them against you, transparently."
          />
          <ol className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              { n: "01", t: "Share your taste", d: "Nine quick questions: families, notes, budget, seasons, occasions, strength and the notes you never want to smell." },
              { n: "02", t: "We score everything", d: "Hard limits filter first, then weighted scoring across scent, occasion, budget, season and strength ranks what's left." },
              { n: "03", t: "Refine as you go", d: "Love it, too sweet, too strong: every reaction adjusts your profile in plain sight and can be undone." },
            ].map((s) => (
              <li key={s.n} className="surface rounded-2xl p-7">
                <span className="font-display text-4xl text-champagne/70">{s.n}</span>
                <h3 className="mt-4 text-2xl text-ivory">{s.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-mist">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Featured */}
      <section className="py-20">
        <div className="page-container">
          <SectionHeading
            eyebrow="Featured"
            title="A curated shelf, one family at a time"
            description="The highest-rated fragrance from each scent family in our demonstration catalog."
            action={
              <Button asChild variant="secondary">
                <Link href="/fragrances">
                  Browse all <ArrowRight />
                </Link>
              </Button>
            }
          />
          <FragranceGrid className="mt-10">
            {picks.map((f, i) => (
              <FragranceCard key={f.id} fragrance={toSummary(f)} priority={i < 4} />
            ))}
          </FragranceGrid>
        </div>
      </section>

      {/* Features */}
      <section className="py-10">
        <div className="page-container">
          <SectionHeading eyebrow="Everything in one place" title="Built around how you actually wear fragrance" />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Link key={f.href} href={f.href} className="group surface rounded-2xl p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-champagne/25">
                <div className="mb-5 grid size-11 place-items-center rounded-full border border-champagne/25 bg-champagne/[0.07]">
                  <f.icon className="size-5 text-champagne" />
                </div>
                <h3 className="text-2xl text-ivory">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-mist">{f.body}</p>
                <span className="mt-5 inline-flex items-center gap-1 text-xs font-medium text-champagne opacity-80 transition-opacity group-hover:opacity-100">
                  Open <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Transparency */}
      <section className="py-20">
        <div className="page-container grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="eyebrow mb-4">Transparent matching</p>
            <h2 className="text-balance text-4xl text-ivory sm:text-5xl">A match score you can actually read.</h2>
            <p className="mt-5 max-w-lg text-sm leading-relaxed text-mist sm:text-base">
              &ldquo;92% match&rdquo; is an algorithmic compatibility score: how closely a fragrance fits what you told us. It isn&apos;t a probability
              that you&apos;ll love it. Strict budgets and excluded notes are hard limits, never just penalties.
            </p>
            <Button asChild variant="link" className="mt-6">
              <Link href="/about">How the engine works →</Link>
            </Button>
          </div>
          <div className="surface rounded-2xl p-7">
            <p className="text-xs uppercase tracking-[0.16em] text-dim">Default scoring weights</p>
            <div className="mt-6 space-y-5">
              {(Object.keys(DEFAULT_WEIGHTS) as Array<keyof typeof DEFAULT_WEIGHTS>).map((k) => (
                <div key={k}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="text-parchment">{WEIGHT_LABELS[k]}</span>
                    <span className="text-champagne">{Math.round(DEFAULT_WEIGHTS[k] * 100)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-ivory/[0.07]">
                    <div className="h-full rounded-full bg-ivory" style={{ width: `${DEFAULT_WEIGHTS[k] * 100 * 2.6}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-6 text-xs text-dim">Applied after hard filters: strict budget, excluded notes, hidden and owned fragrances.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="page-container">
        <div className="relative overflow-hidden rounded-lg border border-ivory/10 bg-charcoal px-6 py-16 text-center sm:px-12">
          <h2 className="text-balance text-4xl text-ivory sm:text-5xl">Two minutes to your signature.</h2>
          <p className="mx-auto mt-4 max-w-lg text-sm text-mist sm:text-base">No account needed to take the quiz. Save your results whenever you&apos;re ready.</p>
          <Button asChild size="lg" className="mt-8">
            <Link href="/quiz">
              Start the quiz <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
