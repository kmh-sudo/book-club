import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500",
  {
    variants: {
      variant: {
        default:
          "bg-amber-600 text-white shadow-sm",
        secondary:
          "bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300",
        destructive:
          "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300",
        outline:
          "border border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300",
        success:
          "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
