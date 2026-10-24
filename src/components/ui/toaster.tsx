"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import Link from "next/link";

type ToastTone = "success" | "info" | "error";
interface ToastItem {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
  action?: { label: string; href: string };
}

const ToastContext = React.createContext<(t: Omit<ToastItem, "id">) => void>(() => {});

export function useToast() {
  return React.useContext(ToastContext);
}

const ICONS = { success: CheckCircle2, info: Info, error: TriangleAlert };

export function Toaster({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const dismiss = React.useCallback((id: number) => setItems((all) => all.filter((t) => t.id !== id)), []);
  const push = React.useCallback(
    (t: Omit<ToastItem, "id">) => {
      const id = Date.now() + Math.random();
      setItems((all) => [...all.slice(-2), { ...t, id }]);
      setTimeout(() => dismiss(id), t.tone === "error" ? 6000 : 3800);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 left-1/2 z-[60] flex w-[min(92vw,24rem)] -translate-x-1/2 flex-col gap-2 sm:left-auto sm:right-6 sm:translate-x-0">
        <AnimatePresence initial={false}>
          {items.map((t) => {
            const Icon = ICONS[t.tone];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                transition={{ duration: 0.22 }}
                role={t.tone === "error" ? "alert" : "status"}
                className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-ivory/10 bg-graphite/95 p-4 shadow-[0_8px_24px_-12px_rgb(27_25_22/0.25)]"
              >
                <Icon className={t.tone === "error" ? "mt-0.5 size-4.5 text-danger" : "mt-0.5 size-4.5 text-champagne"} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ivory">{t.title}</p>
                  {t.description && <p className="mt-0.5 text-xs leading-relaxed text-mist">{t.description}</p>}
                  {t.action && (
                    <Link href={t.action.href} className="mt-2 inline-block text-xs font-medium text-champagne hover:underline">
                      {t.action.label} →
                    </Link>
                  )}
                </div>
                <button onClick={() => dismiss(t.id)} aria-label="Dismiss notification" className="text-dim hover:text-ivory">
                  <X className="size-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
