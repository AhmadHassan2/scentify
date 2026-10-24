import type { Metadata } from "next";
import { DiscoverView } from "@/components/discover/discover-view";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Discovery Mode" };

export default function DiscoverPage() {
  return (
    <div className="page-container">
      <PageHeader
        eyebrow="Discovery Mode"
        title="Wander a little further"
        description="Each shelf balances what you already love with something new, then spreads its picks so no two feel the same."
      />
      <DiscoverView />
    </div>
  );
}
