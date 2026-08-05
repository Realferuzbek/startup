import { Girih } from "@/components/shared/girih";
import { cn } from "@/lib/utils";

// The verification mark — the girih's primary, load-bearing use. Pairs the mark
// (never color alone) with the label. The caller supplies the translated label.
export function VerifiedBadge({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm bg-verified-soft px-1.5 py-1 text-verified",
        "text-label font-mono uppercase",
        className,
      )}
    >
      <Girih size={14} strokeWidth={1.5} />
      {label}
    </span>
  );
}
