import * as React from "react";
import { cn } from "@/lib/utils";

// Loading placeholder. The pulse respects prefers-reduced-motion via the global
// rule in globals.css. Size and shape come from className.
export function Skeleton({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-rule", className)}
      {...props}
    />
  );
}
