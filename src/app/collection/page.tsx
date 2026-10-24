import type { Metadata } from "next";
import { CollectionView } from "@/components/collection/collection-view";
import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/lib/auth/session";
import { getCatalog } from "@/lib/database/catalog";
import { toSummary } from "@/lib/fragrance/utils";

export const metadata: Metadata = { title: "My collection" };

export default async function CollectionPage() {
  await requireUser("/collection");
  const catalog = await getCatalog();
  return (
    <div className="page-container">
      <PageHeader eyebrow="Your shelf" title="My collection" description="Everything you own: rate it, add personal notes, mark favourites. It powers your daily picks and your Fragrance DNA." />
      <CollectionView all={catalog.map(toSummary)} />
    </div>
  );
}
