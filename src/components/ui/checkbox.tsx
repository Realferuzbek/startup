import * as React from "react";
import { cn } from "@/lib/utils";

// Native checkbox tinted with the registry color. Pair it inside a <label> with
// min-h-11 so the tap target reaches 44px (see the design preview).
export const Checkbox = React.forwardRef<
  HTMLInputElement,
  Omit<React.ComponentPropsWithoutRef<"input">, "type">
>(function Checkbox({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        "size-[18px] shrink-0 cursor-pointer rounded-sm border border-rule-strong",
        "accent-[var(--registry)] transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-registry/40",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
});
