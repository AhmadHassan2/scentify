import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { BottleStage } from "@/components/fragrance/bottle";
import { FeedbackControls } from "@/components/fragrance/feedback-controls";
import { FragranceActions } from "@/components/fragrance/fragrance-actions";
import { PersonalMatch } from "@/components/fragrance/personal-match";
import {
  AccordBars,
  DemoDataNotice,
  NotesPyramid,
  OccasionChart,
  PerformanceMeters,
  SeasonChart,
} from "@/components/fragrance/profile-blocks";
import { SimilarFragrances } from "@/components/fragrance/similar-fragrances";
import { Badge, Card } from "@/components/ui/primitives";
import { getCatalog, getFragranceBySlug } from "@/lib/database/catalog";
import { CONCENTRATION_META, FAMILY_META, formatPrice } from "@/lib/fragrance/taxonomy";

export const revalidate = 3600;

export async function generateStaticParams() {
  return (await getCatalog()).map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const f = await getFragranceBySlug((await params).slug);
  if (!f) return { title: "Fragrance not found" };
  return { title: `${f.name} by ${f.brand}`, description: f.description };
}

function Section({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return (
    <Card className="p-6 sm:p-7">
      <p className="eyebrow mb-2">{eyebrow}</p>
      <h2 className="mb-6 text-2xl text-ivory">{title}</h2>
      {children}
    </Card>
  );
}

export default async function FragrancePage({ params }: { params: Promise<{ slug: string }> }) {
  const f = await getFragranceBySlug((await params).slug);
  if (!f) notFound();
  const family = FAMILY_META[f.families[0]];
  const variants = [...f.variants].sort((a, b) => a.sizeMl - b.sizeMl);

  return (
    <div className="page-container pb-10 pt-6">
      <Link href="/fragrances" className="inline-flex items-center gap-1 text-xs text-mist hover:text-ivory">
        <ChevronLeft className="size-3.5" /> All fragrances
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-14">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <BottleStage
            visual={f.visual}
            brand={f.brand}
            name={f.name}
            tone={family.tone}
            className="aspect-square rounded-lg border border-ivory/[0.07]"
            bottleClassName="p-[14%]"
          />
          <p className="mt-3 text-center text-[0.68rem] text-dim">Illustration — not a product photograph.</p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-champagne">{f.brand}</p>
          <h1 className="mt-3 text-5xl leading-none text-ivory sm:text-6xl">{f.name}</h1>
          <div className="mt-5 flex flex-wrap gap-2">
            <Badge variant="gold">{CONCENTRATION_META[f.concentration].label}</Badge>
            {f.families.map((fam) => (
              <Badge key={fam}>{FAMILY_META[fam].label}</Badge>
            ))}
            <Badge variant="outline">{f.gender === "unisex" ? "Unisex" : f.gender === "masculine" ? "Masculine-leaning" : "Feminine-leaning"}</Badge>
            <Badge variant="outline">{f.releaseYear}</Badge>
            {f.isSynthetic && <Badge variant="demo">Demo data</Badge>}
          </div>
          <p className="mt-6 text-[0.98rem] leading-relaxed text-parchment/90">{f.description}</p>

          <div className="mt-6 flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <p className="text-3xl text-ivory">
              {formatPrice(variants[0].price)}
              <span className="ml-1.5 text-sm text-dim">from · {variants[0].sizeMl} ml</span>
            </p>
            <p className="text-sm text-mist">★ {f.rating.toFixed(1)} rating</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {variants.map((v) => (
              <span key={v.id} className="rounded-xl border border-ivory/10 px-3.5 py-2 text-xs text-parchment">
                {v.sizeMl} ml · <span className="text-ivory">{formatPrice(v.price)}</span>
              </span>
            ))}
          </div>
          {f.isSynthetic && (
            <p className="mt-2 text-[0.7rem] text-dim">Demonstration prices in CAD. No retailer offers are available for demo products.</p>
          )}

          <div className="mt-8">
            <FragranceActions id={f.id} name={f.name} />
          </div>

          <div className="mt-8">
            <PersonalMatch fragranceId={f.id} />
          </div>

          <div className="mt-6">
            <p className="mb-2.5 text-xs text-dim">Tell us what you think. It tunes future recommendations.</p>
            <FeedbackControls fragranceId={f.id} name={f.name} />
          </div>
        </div>
      </div>

      <div className="mt-16 grid gap-5 lg:grid-cols-2">
        <Section eyebrow="Composition" title="Notes pyramid">
          <NotesPyramid notes={f.notes} />
        </Section>
        <Section eyebrow="Character" title="Main accords">
          <AccordBars accords={f.accords} />
        </Section>
        <Section eyebrow="Performance" title="Longevity & projection">
          <PerformanceMeters f={f} />
        </Section>
        <Section eyebrow="When to wear" title="Season suitability">
          <SeasonChart seasons={f.seasons} />
        </Section>
        <div className="lg:col-span-2">
          <Section eyebrow="Where to wear" title="Occasion suitability">
            <OccasionChart occasions={f.occasions} />
          </Section>
        </div>
      </div>

      <div className="mt-16">
        <SimilarFragrances fragranceId={f.id} name={f.name} />
      </div>

      {f.isSynthetic && <DemoDataNotice className="mt-12" />}
      <p className="mt-3 text-[0.68rem] text-dim">
        Source: {f.source.attribution} · Record {f.source.providerRecordId} · Updated {new Date(f.source.lastUpdated).toLocaleDateString("en-CA")}
      </p>
    </div>
  );
}
