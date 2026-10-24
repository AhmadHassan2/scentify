"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ExternalLink, Maximize2, MessageCircle, Minimize2, X } from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { cn } from "@/lib/utils";
import { ChatView } from "./chat-view";

/**
 * Floating "Scentify Assistant" available on every page. The conversation
 * stays mounted while closed, so it survives navigation and re-opening.
 */
export function AssistantWidget() {
  const pathname = usePathname();
  const { compareIds } = useApp();
  const reduce = useReducedMotion();
  const [open, setOpen] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const launcherRef = React.useRef<HTMLButtonElement>(null);

  const openPanel = () => {
    setMounted(true);
    setOpen(true);
  };
  const close = React.useCallback(() => {
    setOpen(false);
    launcherRef.current?.focus();
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  // The full-page assistant already lives at /chat.
  if (pathname === "/chat") return null;

  // Sit above the compare tray on narrower screens.
  const trayVisible = compareIds.length > 0 && pathname !== "/compare";

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            ref={launcherRef}
            type="button"
            onClick={openPanel}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            aria-haspopup="dialog"
            aria-label="Open Scentify Assistant"
            className={cn(
              "fixed right-4 z-50 flex h-12 cursor-pointer items-center gap-2.5 rounded-full bg-ivory pl-4 pr-5 text-sm font-medium text-ink shadow-[0_8px_24px_-10px_rgb(27_25_22/0.45)] transition-transform hover:-translate-y-0.5 sm:right-6",
              trayVisible ? "bottom-20 lg:bottom-6" : "bottom-4 sm:bottom-6",
            )}
          >
            <MessageCircle className="size-5" />
            <span className="hidden sm:inline">Scentify Assistant</span>
          </motion.button>
        )}
      </AnimatePresence>

      {mounted && (
        <motion.div
          role="dialog"
          aria-modal="false"
          aria-label="Scentify Assistant"
          hidden={!open}
          initial={false}
          animate={open ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.96, y: 16 }}
          transition={{ duration: reduce ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformOrigin: "bottom right" }}
          className={cn(
            "fixed z-50 overflow-hidden rounded-lg border border-ivory/15 bg-graphite shadow-[0_24px_60px_-20px_rgb(27_25_22/0.4)]",
            // Phones: near full-screen sheet. Larger screens: corner panel, expandable.
            "inset-x-2 bottom-2 top-20",
            expanded
              ? "sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[min(88vh,52rem)] sm:w-[min(calc(100vw-3rem),46rem)]"
              : "sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[min(78vh,40rem)] sm:w-[25rem]",
          )}
        >
          <ChatView
            variant="widget"
            headerActions={
              <>
                <button
                  type="button"
                  onClick={() => setExpanded((e) => !e)}
                  aria-label={expanded ? "Shrink assistant" : "Expand assistant"}
                  aria-pressed={expanded}
                  className="hidden size-8 cursor-pointer place-items-center rounded-md text-mist hover:bg-ivory/[0.06] hover:text-ivory sm:grid"
                >
                  {expanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
                </button>
                <Link
                  href="/chat"
                  onClick={() => setOpen(false)}
                  aria-label="Open assistant full page"
                  className="grid size-8 place-items-center rounded-md text-mist hover:bg-ivory/[0.06] hover:text-ivory"
                >
                  <ExternalLink className="size-4" />
                </Link>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close assistant"
                  className="grid size-8 cursor-pointer place-items-center rounded-md text-mist hover:bg-ivory/[0.06] hover:text-ivory"
                >
                  <X className="size-4" />
                </button>
              </>
            }
          />
        </motion.div>
      )}
    </>
  );
}
