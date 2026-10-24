import { FragranceCardSkeleton, FragranceGrid } from "@/components/fragrance/fragrance-card";

export default function Loading() {
  return (
    <div className="page-container py-14" aria-busy="true" aria-label="Loading">
      <div className="skeleton mb-3 h-3 w-28 rounded" />
      <div className="skeleton mb-10 h-10 w-72 rounded" />
      <FragranceGrid>
        {Array.from({ length: 8 }).map((_, i) => (
          <FragranceCardSkeleton key={i} />
        ))}
      </FragranceGrid>
    </div>
  );
}
