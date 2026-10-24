"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { GitCompareArrows, X } from "lucide-react";
import { useApp, MAX_COMPARE } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";

export function CompareTray() {
  const { compareIds, clearCompare } = useApp();
  const pathname = usePathname();
  const visible = compareIds.length > 0 && pathname !== "/compare";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", damping: 26, stiffness: 260 }}
          className="fixed bottom-4 left-1/2 z-40 w-[min(92vw,26rem)] -translate-x-1/2"
        >
          <div className="flex items-center gap-3 rounded-full border border-champagne/25 bg-graphite/95 py-2 pl-5 pr-2 shadow-[0_8px_24px_-12px_rgb(27_25_22/0.25)]">
            <GitCompareArrows className="size-4 shrink-0 text-champagne" />
            <p className="flex-1 text-sm text-parchment">
              {compareIds.length} of {MAX_COMPARE} selected
              <span className="hidden text-dim min-[400px]:inline"> to compare</span>
            </p>
            <button onClick={clearCompare} aria-label="Clear comparison" className="rounded-full p-2 text-dim hover:text-ivory">
              <X className="size-4" />
            </button>
            {compareIds.length < 2 ? (
              <Button size="sm" disabled>
                Compare
              </Button>
            ) : (
              <Button asChild size="sm">
                <Link href={`/compare?ids=${compareIds.join(",")}`}>Compare</Link>
              </Button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
