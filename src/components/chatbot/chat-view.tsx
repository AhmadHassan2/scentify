"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUp, Bot, Cpu, Loader2, RotateCcw, Sparkles } from "lucide-react";
import type { ChatResponseDTO, RecommendationDTO } from "@/types/dto";
import { useApp } from "@/components/providers/app-provider";
import { Bottle } from "@/components/fragrance/bottle";
import { MatchBadge } from "@/components/fragrance/match-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toaster";
import { apiPost } from "@/lib/client/api";
import { formatPrice } from "@/lib/fragrance/taxonomy";
import { cn } from "@/lib/utils";
import { RichText } from "./rich-text";

interface Turn {
  role: "user" | "assistant";
  content: string;
  fragrances?: RecommendationDTO[];
  appliedFilters?: string[];
  error?: boolean;
}

const SUGGESTIONS = [
  "Find me a fresh masculine cologne under $150",
  "I want something sweet and strong for winter",
  "Recommend a date-night fragrance that isn't too expensive",
  "I like Bleu de Chanel. What else should I try?",
  "What fragrance from my collection should I wear today?",
  "Find something different from my usual preferences",
];

function MiniCard({ rec }: { rec: RecommendationDTO }) {
  const f = rec.fragrance;
  return (
    <Link href={`/fragrance/${f.slug}`} className="surface group flex w-60 shrink-0 gap-3 rounded-2xl p-3 transition-colors hover:border-champagne/25">
      <div className="h-20 w-14 shrink-0"><Bottle visual={f.visual} brand={f.brand} name={f.name} /></div>
      <div className="min-w-0">
        <p className="truncate text-[0.62rem] uppercase tracking-[0.14em] text-dim">{f.brand}</p>
        <p className="truncate font-display text-lg leading-tight text-ivory group-hover:text-champagne-soft">{f.name}</p>
        <p className="mt-0.5 text-xs text-mist">{formatPrice(f.priceFrom)} · {f.priceFromSizeMl} ml</p>
        <div className="mt-1.5"><MatchBadge value={rec.matchPercent} /></div>
      </div>
    </Link>
  );
}

export function ChatView({ variant = "page", headerActions }: { variant?: "page" | "widget"; headerActions?: React.ReactNode }) {
  const widget = variant === "widget";
  const { personalization, config, ready } = useApp();
  const toast = useToast();
  const [turns, setTurns] = React.useState<Turn[]>([]);
  const [input, setInput] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [state, setState] = React.useState<Record<string, unknown>>({});
  const [mode, setMode] = React.useState<"openai" | "local" | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  // Scroll only the message list (never the page behind a floating widget).
  React.useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [turns, pending]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || pending) return;
    const next: Turn[] = [...turns, { role: "user", content }];
    setTurns(next);
    setInput("");
    setPending(true);
    try {
      const res = await apiPost<ChatResponseDTO>("/api/chat", {
        messages: next.filter((t) => !t.error).map((t) => ({ role: t.role, content: t.content })).slice(-20),
        state,
        ...personalization,
      });
      setState(res.state);
      setMode(res.mode);
      setTurns((t) => [...t, { role: "assistant", content: res.message, fragrances: res.fragrances, appliedFilters: res.appliedFilters }]);
    } catch (e) {
      setTurns((t) => [...t, { role: "assistant", content: (e as Error).message, error: true }]);
      toast({ tone: "error", title: "The assistant couldn't answer", description: (e as Error).message });
    } finally {
      setPending(false);
      inputRef.current?.focus();
    }
  };

  const assistantMode = mode ?? config?.assistantMode ?? "local";

  return (
    <div className={widget ? "flex h-full flex-col overflow-hidden bg-graphite" : "surface flex min-h-[70vh] flex-col overflow-hidden rounded-lg"}>
      <div className="flex items-center justify-between gap-3 border-b border-ivory/[0.07] px-5 py-3">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-full bg-ivory"><Bot className="size-4 text-ink" /></div>
          <div>
            <p className="text-sm text-ivory">Scentify Assistant</p>
            <p className="flex items-center gap-1 text-[0.68rem] text-dim">
              {assistantMode === "openai" ? <><Sparkles className="size-3" /> AI language understanding + Scentify engine</> : <><Cpu className="size-3" /> Built-in search · no AI key configured</>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {turns.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => { setTurns([]); setState({}); }} aria-label="Start a new chat">
              <RotateCcw /> {!widget && "New chat"}
            </Button>
          )}
          {headerActions}
        </div>
      </div>

      <div ref={scrollRef} className={widget ? "flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-5" : "flex-1 space-y-6 overflow-y-auto px-4 py-6 sm:px-6"} aria-live="polite">
        {turns.length === 0 && (
          <div className={widget ? "py-2 text-center" : "mx-auto max-w-2xl py-6 text-center"}>
            <h2 className={widget ? "font-display text-2xl text-ivory" : "font-display text-3xl text-ivory sm:text-4xl"}>What are you in the mood for?</h2>
            <p className="mt-2 text-sm text-mist">
              Describe it in your own words. I search the Scentify catalog and rank results with our engine, so every fragrance and price I mention is a real record (demo data).
            </p>
            <div className={widget ? "mt-5 grid gap-2" : "mt-8 grid gap-2 sm:grid-cols-2"}>
              {(widget ? SUGGESTIONS.slice(0, 4) : SUGGESTIONS).map((s) => (
                <button key={s} onClick={() => void send(s)} disabled={!ready} className="cursor-pointer rounded-md border border-ivory/12 bg-graphite px-4 py-3 text-left text-sm text-parchment transition-colors hover:border-ivory/40">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((t, i) =>
          t.role === "user" ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[85%] rounded-lg rounded-br-sm bg-ivory px-4 py-2.5 text-[0.92rem] text-ink">{t.content}</p>
            </div>
          ) : (
            <div key={i} className="max-w-[95%] space-y-3">
              {t.appliedFilters && t.appliedFilters.length > 0 && (
                <div className="flex flex-wrap gap-1.5" aria-label="What I understood">
                  {t.appliedFilters.map((f) => <Badge key={f} variant="outline">{f}</Badge>)}
                </div>
              )}
              <div className={t.error ? "rounded-2xl border border-danger/30 bg-danger/[0.05] px-4 py-3 text-sm text-danger" : ""}>
                {t.error ? t.content : <RichText text={t.content} />}
              </div>
              {t.fragrances && t.fragrances.length > 0 && (
                <div className={cn("scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4 pb-1", !widget && "sm:-mx-6 sm:px-6")}>
                  {t.fragrances.map((r) => <MiniCard key={r.fragrance.id} rec={r} />)}
                </div>
              )}
            </div>
          ),
        )}
        {pending && (
          <div className="flex items-center gap-2 text-sm text-mist">
            <Loader2 className="size-4 animate-spin text-champagne" /> Searching the catalog…
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); void send(input); }}
        className="border-t border-ivory/[0.07] p-3 sm:p-4"
      >
        <div className="flex items-end gap-2 rounded-2xl border border-ivory/12 bg-ivory/[0.03] p-2 focus-within:border-champagne/50">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            rows={1}
            maxLength={1000}
            placeholder={widget ? "Ask about a scent…" : "e.g. Something woody for the office, no oud, under $120"}
            aria-label="Message the fragrance assistant"
            className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-ivory placeholder:text-dim focus:outline-none"
          />
          <Button type="submit" size="icon" disabled={!input.trim() || pending} aria-label="Send message">
            {pending ? <Loader2 className="animate-spin" /> : <ArrowUp />}
          </Button>
        </div>
        <p className="mt-2 px-1 text-[0.65rem] text-dim">Follow up naturally: &ldquo;cheaper&rdquo;, &ldquo;stronger&rdquo;, &ldquo;no tobacco&rdquo;, &ldquo;compare the first two&rdquo;.</p>
      </form>
    </div>
  );
}
