import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { DnaView } from "@/components/profile/dna-view";

export const metadata: Metadata = { title: "Fragrance DNA" };

export default function ProfilePage() {
  return (
    <div className="page-container">
      <PageHeader
        eyebrow="Fragrance DNA"
        title="Your taste, decoded"
        description="A living summary of what you love, blended from your answers, your reactions and the bottles you own. Edit anything at any time."
      />
      <DnaView />
    </div>
  );
}
