import * as React from "react";
import { cn } from "@/lib/utils";

// Labels sit above the field, 14px, supporting-text color.
export const Label = React.forwardRef<
  HTMLLabelElement,
  React.ComponentPropsWithoutRef<"label">
>(function Label({ className, ...props }, ref) {
  return (
    <label
      ref={ref}
      className={cn("text-small text-ink-secondary block", className)}
      {...props}
    />
  );
});
