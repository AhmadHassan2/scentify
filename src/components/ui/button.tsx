import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[4px] font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer select-none",
  {
    variants: {
      variant: {
        primary: "bg-ivory text-ink hover:bg-parchment active:translate-y-px",
        secondary: "border border-ivory/25 bg-transparent text-ivory hover:border-ivory/60 hover:bg-ivory/[0.03] active:translate-y-px",
        ghost: "text-mist hover:bg-ivory/[0.06] hover:text-ivory",
        subtle: "bg-ivory/[0.06] text-ivory hover:bg-ivory/[0.1]",
        danger: "border border-danger/40 text-danger hover:bg-danger/10",
        link: "rounded-none p-0 text-ivory underline underline-offset-4 decoration-ivory/30 hover:decoration-ivory",
      },
      size: {
        sm: "h-8 px-3.5 text-xs",
        md: "h-10 px-5 text-sm",
        lg: "h-12 px-7 text-[0.95rem]",
        icon: "size-10",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
