import * as React from "react";
import { cn } from "@/lib/utils";

export const fieldClass =
  "w-full rounded-md border border-rule-strong bg-surface text-ink text-body " +
  "placeholder:text-ink-muted transition-colors duration-150 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-registry/20 focus-visible:border-registry " +
  "disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-danger";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.ComponentPropsWithoutRef<"input">
>(function Input({ className, type = "text", ...props }, ref) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(fieldClass, "h-10 px-3", className)}
      {...props}
    />
  );
});
