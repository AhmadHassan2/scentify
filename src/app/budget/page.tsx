import type { Metadata } from "next";
import { BudgetFinder } from "@/components/budget/budget-finder";
import { PageHeader } from "@/components/layout/page-header";
import { getBrands } from "@/lib/database/catalog";

export const metadata: Metadata = { title: "Budget Finder" };

export default async function BudgetPage() {
  const brands = await getBrands();
  return (
    <div className="page-container">
      <PageHeader
        eyebrow="Budget Finder"
        title="The best fragrances for your budget"
        description="Set a hard ceiling and we'll never cross it. Within it, everything is ranked by how well it fits your taste."
      />
      <BudgetFinder brands={brands} />
    </div>
  );
}
