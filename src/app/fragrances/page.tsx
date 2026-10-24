import type { Metadata } from "next";
import { CatalogBrowser } from "@/components/fragrance/catalog-browser";
import { PageHeader } from "@/components/layout/page-header";
import { getCatalog } from "@/lib/database/catalog";
import { toSummary } from "@/lib/fragrance/utils";

export const metadata: Metadata = { title: "Browse fragrances" };
export const revalidate = 3600;

export default async function FragrancesPage() {
  const catalog = await getCatalog();
  return (
    <div className="page-container">
      <PageHeader
        eyebrow="The catalog"
        title="Browse every fragrance"
        description="Search by name, house or note. Take the quiz and every card shows how well it fits you."
      />
      <CatalogBrowser fragrances={catalog.map(toSummary)} />
    </div>
  );
}
