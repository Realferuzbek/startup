import * as React from "react";
import { Girih } from "@/components/shared/girih";
import { cn } from "@/lib/utils";

// The one illustration in the product: the girih, large and at low opacity.
// Empty states are invitations — name the space and offer the action.
export function EmptyState({
  heading,
  body,
  action,
  className,
}: {
  heading: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 px-6 py-16 text-center",
        className,
      )}
    >
      <Girih
        size={112}
        strokeWidth={1.5}
        className="text-registry opacity-10"
      />
      <h2 className="text-h3 text-ink">{heading}</h2>
      {body ? (
        <p className="text-small text-ink-secondary max-w-prose">{body}</p>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
