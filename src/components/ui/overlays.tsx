"use client";

import * as React from "react";
import { Dialog as D, DropdownMenu as M, Slider as S, Switch as Sw, Tabs as T, Tooltip as Tt } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/* Tooltip ───────────────────────────────────────────────────── */
export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <Tt.Provider delayDuration={200}>{children}</Tt.Provider>;
}

export function Tooltip({ content, children, side = "top" }: { content: React.ReactNode; children: React.ReactNode; side?: "top" | "bottom" | "left" | "right" }) {
  return (
    <Tt.Root>
      <Tt.Trigger asChild>{children}</Tt.Trigger>
      <Tt.Portal>
        <Tt.Content
          side={side}
          sideOffset={8}
          className="z-50 max-w-64 rounded-xl border border-ivory/10 bg-graphite px-3 py-2 text-xs leading-relaxed text-parchment shadow-[0_8px_24px_-12px_rgb(27_25_22/0.25)]"
        >
          {content}
          <Tt.Arrow className="fill-graphite" />
        </Tt.Content>
      </Tt.Portal>
    </Tt.Root>
  );
}

/* Dialog / Sheet ────────────────────────────────────────────── */
export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({
  title,
  description,
  children,
  side,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  side?: "right";
  className?: string;
}) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm data-[state=open]:animate-[fadeIn_.2s_ease]" />
      <D.Content
        className={cn(
          "fixed z-50 border-ivory/10 bg-charcoal p-6 shadow-[0_8px_24px_-12px_rgb(27_25_22/0.25)] focus:outline-none",
          side === "right"
            ? "inset-y-0 right-0 w-[min(88vw,22rem)] border-l"
            : "left-1/2 top-1/2 w-[min(92vw,32rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border",
          className,
        )}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <D.Title className="font-display text-2xl text-ivory">{title}</D.Title>
            {description ? (
              <D.Description className="mt-1 text-sm text-mist">{description}</D.Description>
            ) : (
              <D.Description className="sr-only">{title}</D.Description>
            )}
          </div>
          <D.Close aria-label="Close" className="rounded-full p-1.5 text-mist hover:bg-ivory/5 hover:text-ivory">
            <X className="size-5" />
          </D.Close>
        </div>
        {children}
      </D.Content>
    </D.Portal>
  );
}

/* Dropdown ─────────────────────────────────────────────────── */
export const Dropdown = M.Root;
export const DropdownTrigger = M.Trigger;

export function DropdownContent({ children, align = "end" }: { children: React.ReactNode; align?: "start" | "end" }) {
  return (
    <M.Portal>
      <M.Content
        align={align}
        sideOffset={10}
        className="z-50 min-w-52 rounded-2xl border border-ivory/10 bg-graphite p-1.5 shadow-[0_8px_24px_-12px_rgb(27_25_22/0.25)]"
      >
        {children}
      </M.Content>
    </M.Portal>
  );
}

export function DropdownItem({ className, ...props }: React.ComponentProps<typeof M.Item>) {
  return (
    <M.Item
      className={cn(
        "flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-parchment outline-none data-[highlighted]:bg-ivory/[0.07] data-[highlighted]:text-ivory [&_svg]:size-4 [&_svg]:text-mist",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownSeparator() {
  return <M.Separator className="my-1 h-px bg-ivory/10" />;
}

export function DropdownLabel({ children }: { children: React.ReactNode }) {
  return <M.Label className="px-3 pb-1 pt-2 text-xs text-dim">{children}</M.Label>;
}

/* Slider ───────────────────────────────────────────────────── */
export function Slider({ className, thumbLabels, ...props }: React.ComponentProps<typeof S.Root> & { thumbLabels?: string[] }) {
  const count = (props.value ?? props.defaultValue ?? [0]).length;
  return (
    <S.Root className={cn("relative flex h-6 w-full touch-none select-none items-center", className)} {...props}>
      <S.Track className="relative h-1 grow overflow-hidden rounded-full bg-ivory/10">
        <S.Range className="absolute h-full bg-ivory" />
      </S.Track>
      {Array.from({ length: count }).map((_, i) => (
        <S.Thumb
          key={i}
          aria-label={thumbLabels?.[i]}
          className="block size-5 cursor-grab rounded-full border-2 border-champagne bg-ink shadow-[0_0_0_4px_rgb(216_190_140/0.15)] transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-champagne/40 active:cursor-grabbing"
        />
      ))}
    </S.Root>
  );
}

/* Switch ───────────────────────────────────────────────────── */
export function Switch({ className, ...props }: React.ComponentProps<typeof Sw.Root>) {
  return (
    <Sw.Root
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-ivory/15 bg-ivory/10 transition-colors data-[state=checked]:border-ivory data-[state=checked]:bg-ivory",
        className,
      )}
      {...props}
    >
      <Sw.Thumb className="block size-4.5 translate-x-0.5 rounded-full bg-ivory shadow transition-transform data-[state=checked]:translate-x-[1.35rem] data-[state=checked]:bg-ink" />
    </Sw.Root>
  );
}

/* Tabs ─────────────────────────────────────────────────────── */
export const Tabs = T.Root;
export const TabsContent = T.Content;

export function TabsList({ className, ...props }: React.ComponentProps<typeof T.List>) {
  return (
    <T.List
      className={cn("scrollbar-none flex gap-1 overflow-x-auto rounded-full border border-ivory/10 bg-ivory/[0.02] p-1", className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof T.Trigger>) {
  return (
    <T.Trigger
      className={cn(
        "shrink-0 cursor-pointer rounded-full px-4 py-1.5 text-xs font-medium text-mist transition-colors hover:text-ivory data-[state=active]:bg-ivory data-[state=active]:text-ink",
        className,
      )}
      {...props}
    />
  );
}
