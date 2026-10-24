import type { Metadata } from "next";
import { Quiz } from "@/components/quiz/quiz";
import { getCatalog } from "@/lib/database/catalog";
import { entryPrice } from "@/lib/fragrance/utils";

export const metadata: Metadata = {
  title: "Find your scent",
  description: "Nine quick questions to build your fragrance profile.",
};

export default async function QuizPage() {
  const prices = (await getCatalog()).map(entryPrice);
  return (
    <div className="page-container pb-16 pt-8 sm:pt-10">
      <Quiz prices={prices} />
    </div>
  );
}
