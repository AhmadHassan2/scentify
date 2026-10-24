import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { TodayView } from "@/components/today/today-view";

export const metadata: Metadata = { title: "What should I wear today?" };

export default function TodayPage() {
  return (
    <div className="page-container">
      <PageHeader
        eyebrow="Daily pick"
        title="What should I wear today?"
        description="We weigh temperature, humidity, conditions, the occasion and time of day against your collection to pick today's three best options."
      />
      <TodayView />
    </div>
  );
}
