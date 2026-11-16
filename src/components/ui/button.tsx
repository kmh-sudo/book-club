import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-linear-to-r from-amber-600 to-amber-700 text-white shadow-md shadow-amber-600/20 hover:from-amber-700 hover:to-amber-800 hover:shadow-lg hover:shadow-amber-600/30",
        destructive:
          "bg-red-600 text-white shadow-sm hover:bg-red-700 active:scale-95",
        outline:
          "border border-stone-200 bg-white/80 hover:bg-amber-50/50 hover:text-amber-900 dark:border-stone-800 dark:bg-stone-900/80 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300",
        secondary:
          "bg-amber-100/70 text-amber-900 hover:bg-amber-200/70 dark:bg-stone-800 dark:text-amber-300 dark:hover:bg-stone-700",
        ghost:
          "hover:bg-amber-100/50 hover:text-amber-900 dark:hover:bg-stone-800 dark:text-stone-300 text-stone-600",
        link: "text-amber-700 underline-offset-4 hover:underline dark:text-amber-400 p-0 h-auto font-medium",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-11 rounded-2xl px-6 text-base shadow-lg",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
