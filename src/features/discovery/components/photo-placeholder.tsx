import { cn } from "@/lib/utils";

// Neutral stand-in for a missing cover photo — a muted image glyph on the rule
// fill, never a broken <img>. Shared by the listing card and the detail gallery.
export function PhotoPlaceholder({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "bg-rule text-ink-muted flex h-full w-full items-center justify-center",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        width="32"
        height="32"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="4" width="18" height="16" rx="1" />
        <circle cx="8.5" cy="9.5" r="1.5" />
        <path d="M21 16l-5-5L5 20" />
      </svg>
    </div>
  );
}
