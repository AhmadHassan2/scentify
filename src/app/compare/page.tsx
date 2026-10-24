import type { Metadata } from "next";
import { CompareView } from "@/components/compare/compare-view";
import { PageHeader } from "@/components/layout/page-header";
import { getCatalog, getFragrancesByIds } from "@/lib/database/catalog";
import { toSummary } from "@/lib/fragrance/utils";

export const metadata: Metadata = { title: "Compare fragrances" };

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const { ids } = await searchParams;
  const requested = (ids ?? "").split(",").filter(Boolean).slice(0, 3);
  const [fragrances, catalog] = await Promise.all([getFragrancesByIds(requested), getCatalog()]);
  return (
    <div className="page-container">
      <PageHeader eyebrow="Compare" title="Side by side" description="Up to three fragrances: price, notes, accords, seasons, occasions, performance and your personal match." />
      <CompareView fragrances={fragrances} all={catalog.map(toSummary)} />
    </div>
  );
}
