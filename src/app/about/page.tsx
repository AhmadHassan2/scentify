import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/primitives";
import { getCatalog } from "@/lib/database/catalog";
import { DEFAULT_WEIGHTS, ENGINE_VERSION } from "@/lib/recommendation/config";

export const metadata: Metadata = { title: "How matching works" };

const STEPS = [
  { t: "Hard filters", d: "Anything above a strict maximum budget, containing a note you excluded, that you marked “not interested”, or (when you want something new) that you already own is removed outright. These are never just penalties." },
  { t: "Scent score", d: "Family affinity (related families earn partial credit) plus note matching, where related notes count too. Soft dislikes and characteristics like “overly sweet” subtract; reactions you've given add or subtract a bounded, traceable amount." },
  { t: "Context scores", d: "Occasion fit (with your versatility preference), budget fit (gentle decay above a flexible ceiling), season fit, and how close projection and longevity are to what you asked for." },
  { t: "Weighted total", d: "Components are combined with configurable weights, then ranked. Ties fall back to rating and name, so results are deterministic." },
  { t: "Diversity", d: "Top candidates are re-ranked with Maximal Marginal Relevance so you don't get five near-identical fragrances in a row." },
  { t: "Explanations", d: "Reasons and cautions are generated from the same numbers that produced the score. Nothing is written by an AI after the fact." },
];

export default async function AboutPage() {
  const catalog = await getCatalog();
  return (
    <div className="page-container max-w-4xl">
      <PageHeader eyebrow="Transparency" title="How Scentify matches you" description={`Recommendation engine v${ENGINE_VERSION}. Content-based, rule-transparent and written in TypeScript — no black box, and no LLM computing your matches.`} />

      <section className="space-y-4">
        {STEPS.map((s, i) => (
          <Card key={s.t} className="grid gap-4 p-6 sm:grid-cols-[3rem_1fr]">
            <span className="font-display text-3xl text-champagne/70">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <h2 className="text-2xl text-ivory">{s.t}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-mist">{s.d}</p>
            </div>
          </Card>
        ))}
      </section>

      <section className="mt-12">
        <h2 className="text-3xl text-ivory">Default weights</h2>
        <p className="mt-2 text-sm text-mist">A starting point we tune over time, not a permanent formula.</p>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {Object.entries(DEFAULT_WEIGHTS).map(([k, v]) => (
            <Card key={k} className="p-4 text-center">
              <p className="font-display text-3xl text-ivory">{Math.round(v * 100)}%</p>
              <p className="mt-1 text-xs capitalize text-mist">{k}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-3xl text-ivory">What “92% match” means</h2>
        <p className="mt-3 text-sm leading-relaxed text-mist">
          It&apos;s an algorithmic compatibility score: how well a fragrance&apos;s structured profile lines up with what you told us. It is not
          the probability that you&apos;ll enjoy it. Skin chemistry, memory and mood all matter, so always sample before you buy a full bottle.
        </p>
      </section>

      <section id="data" className="mt-12 scroll-mt-24">
        <h2 className="text-3xl text-ivory">About the demonstration data</h2>
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-mist">
          <p>
            The current catalog contains <strong className="text-ivory">{catalog.length} synthetic fragrances</strong> from fictional houses. Their names, notes,
            ratings and CAD prices were generated for demonstration and don&apos;t describe real products or real retail offers. Bottle images are
            illustrations drawn by Scentify, not product photography.
          </p>
          <p>
            The records are generated so they stay internally consistent. Seasons, occasions, longevity and projection are derived from each
            fragrance&apos;s notes and concentration, so a dense vanilla-amber extrait leans toward winter evenings because of what it&apos;s made of.
          </p>
          <p>
            The platform is built so licensed datasets and authorized retailer prices can replace this data without changing the engine or
            the interface. Similarity results are described as similar profiles based on listed data, never as duplicates.
          </p>
        </div>
        <p className="mt-6 text-sm">
          <Link href="/quiz" className="text-champagne hover:underline">Take the quiz →</Link>
        </p>
      </section>
    </div>
  );
}
