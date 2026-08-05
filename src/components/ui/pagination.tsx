import * as React from "react";
import { cn } from "@/lib/utils";

// Presentational pagination. Provide `getHref` for crawlable links (SEO) or
// `onPageChange` for client control. Labels/status are passed in (translated by
// the caller). Distinct from the route-bound discovery Pagination.
type PaginationProps = {
  page: number;
  totalPages: number;
  prevLabel: string;
  nextLabel: string;
  status?: React.ReactNode;
  getHref?: (page: number) => string;
  onPageChange?: (page: number) => void;
  className?: string;
};

const controlClass =
  "inline-flex h-9 items-center rounded-md border border-rule-strong px-3 text-button text-ink " +
  "transition-colors duration-150 hover:border-ink-muted " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-registry/40";

export function Pagination({
  page,
  totalPages,
  prevLabel,
  nextLabel,
  status,
  getHref,
  onPageChange,
  className,
}: PaginationProps) {
  const control = (targetPage: number, enabled: boolean, label: string) => {
    if (!enabled) {
      return (
        <span
          aria-disabled="true"
          className={cn(controlClass, "pointer-events-none opacity-60")}
        >
          {label}
        </span>
      );
    }
    if (getHref) {
      return (
        <a href={getHref(targetPage)} className={controlClass}>
          {label}
        </a>
      );
    }
    return (
      <button
        type="button"
        onClick={() => onPageChange?.(targetPage)}
        className={controlClass}
      >
        {label}
      </button>
    );
  };

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex items-center justify-between gap-3", className)}
    >
      {control(page - 1, page > 1, prevLabel)}
      {status ? (
        <span className="text-small text-ink-secondary">{status}</span>
      ) : null}
      {control(page + 1, page < totalPages, nextLabel)}
    </nav>
  );
}
