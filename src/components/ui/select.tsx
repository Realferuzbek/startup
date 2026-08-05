import * as React from "react";
import { cn } from "@/lib/utils";
import { fieldClass } from "./input";

// Styled NATIVE <select> — better mobile UX and zero JS. The chevron is an
// inline SVG overlay (pointer-events-none) so it inherits the muted ink color.
export const Select = React.forwardRef<
  HTMLSelectElement,
  React.ComponentPropsWithoutRef<"select">
>(function Select({ className, children, ...props }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(fieldClass, "h-10 appearance-none pr-9 pl-3", className)}
        {...props}
      >
        {children}
      </select>
      <svg
        viewBox="0 0 16 16"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="text-ink-muted pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
      >
        <path d="M4 6l4 4 4-4" />
      </svg>
    </div>
  );
});
