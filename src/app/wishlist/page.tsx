import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { WishlistView } from "@/components/wishlist/wishlist-view";
import { requireUser } from "@/lib/auth/session";
import { getCatalog } from "@/lib/database/catalog";
import { toSummary } from "@/lib/fragrance/utils";

export const metadata: Metadata = { title: "Wishlist" };

export default async function WishlistPage() {
  await requireUser("/wishlist");
  const catalog = await getCatalog();
  return (
    <div className="page-container">
      <PageHeader eyebrow="Saved for later" title="Your wishlist" description="Fragrances you're considering, with your match score. Select two or three to compare." />
      <WishlistView all={catalog.map(toSummary)} />
    </div>
  );
}
