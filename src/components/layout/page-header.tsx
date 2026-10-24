import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("pb-10 pt-10 sm:pt-14", className)}>
      {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
      <h1 className="text-balance text-4xl leading-[1.05] text-ivory sm:text-5xl lg:text-6xl">{title}</h1>
      {description && <p className="mt-4 max-w-2xl text-sm leading-relaxed text-mist sm:text-base">{description}</p>}
      {children && <div className="mt-6">{children}</div>}
    </header>
  );
}
