import * as React from "react";
import { cn } from "@/lib/utils";

// Surface, 1px hairline, 4px radius, 16px padding. No shadow — separation comes
// from hairlines and whitespace. Hover only raises the border.
export const Card = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div">
>(function Card({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-md border border-rule bg-surface p-4 transition-colors duration-150 hover:border-rule-strong",
        className,
      )}
      {...props}
    />
  );
});
