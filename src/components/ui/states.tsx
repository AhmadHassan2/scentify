import * as React from "react";
import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("surface flex flex-col items-center rounded-2xl px-6 py-14 text-center", className)}>
      {Icon && (
        <div className="mb-5 grid size-14 place-items-center rounded-full border border-champagne/25 bg-champagne/[0.07]">
          <Icon className="size-6 text-champagne" />
        </div>
      )}
      <h3 className="font-display text-2xl text-ivory">{title}</h3>
      {description && <p className="mt-2 max-w-md text-sm leading-relaxed text-mist">{description}</p>}
      {action && <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-2xl border border-danger/25 bg-danger/[0.04] px-6 py-10 text-center">
      <TriangleAlert className="mb-3 size-6 text-danger" />
      <p className="font-display text-xl text-ivory">{title}</p>
      <p className="mt-1.5 max-w-md text-sm text-mist">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
