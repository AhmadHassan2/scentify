"use client";

import { Check, GitCompareArrows, Heart, LibraryBig, ScanSearch } from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FragranceActions({ id, name }: { id: string; name: string }) {
  const { wishlistIds, collectionIds, compareIds, toggleWishlist, updateCollection, toggleCompare } = useApp();
  const saved = wishlistIds.has(id);
  const owned = collectionIds.has(id);
  const comparing = compareIds.includes(id);

  return (
    <div className="flex flex-wrap gap-2.5">
      <Button onClick={() => void toggleWishlist(id, name)} aria-pressed={saved} variant={saved ? "secondary" : "primary"}>
        <Heart className={cn(saved && "fill-current text-rose")} />
        {saved ? "On your wishlist" : "Add to wishlist"}
      </Button>
      <Button
        variant="secondary"
        aria-pressed={owned}
        onClick={() => void updateCollection(id, owned ? "remove" : "upsert", {}, name)}
      >
        {owned ? <Check className="text-sage" /> : <LibraryBig />}
        {owned ? "In your collection" : "Add to collection"}
      </Button>
      <Button variant="secondary" aria-pressed={comparing} onClick={() => toggleCompare(id)}>
        <GitCompareArrows className={cn(comparing && "text-champagne")} />
        {comparing ? "Comparing" : "Compare"}
      </Button>
      <Button variant="ghost" onClick={() => document.getElementById("similar")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
        <ScanSearch /> Find similar
      </Button>
    </div>
  );
}
