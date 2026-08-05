import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-caption font-medium",
  {
    variants: {
      variant: {
        neutral: "bg-rule text-ink-secondary",
        registry: "bg-registry-soft text-registry",
        // `verified` colors are reserved for ownership verification — use only
        // through VerifiedBadge, never as a generic success marker.
        verified: "bg-verified-soft text-verified",
        warning: "bg-warning-soft text-warning",
        danger: "bg-danger-soft text-danger",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export type BadgeProps = React.ComponentPropsWithoutRef<"span"> &
  VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
