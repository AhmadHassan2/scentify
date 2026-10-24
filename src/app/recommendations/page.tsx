import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { ResultsView } from "@/components/recommendations/results-view";

export const metadata: Metadata = { title: "Your matches" };

export default function RecommendationsPage() {
  return (
    <div className="page-container">
      <PageHeader
        eyebrow="Personalized for you"
        title="Your fragrance matches"
        description="Ranked by our recommendation engine. React to any fragrance and the list re-ranks instantly."
      />
      <ResultsView />
    </div>
  );
}
