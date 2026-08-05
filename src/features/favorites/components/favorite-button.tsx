"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { toggleFavorite } from "@/features/favorites/actions";

// Heart toggle. Signed out → routes to login with a return path. Signed in →
// optimistic toggle, reverting if the server rejects. Rendered as a sibling of
// the card link (never nested in the anchor).
export function FavoriteButton({
  listingId,
  initialFavorited,
  signedIn,
  locale,
  className,
}: {
  listingId: string;
  initialFavorited: boolean;
  signedIn: boolean;
  locale: string;
  className?: string;
}) {
  const t = useTranslations("favorites");
  const pathname = usePathname();
  const router = useRouter();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!signedIn) {
      router.push(`/${locale}/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    const next = !favorited;
    setFavorited(next);
    startTransition(async () => {
      const res = await toggleFavorite(listingId);
      if ("error" in res) setFavorited(!next);
      else setFavorited(res.favorited);
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={favorited}
      aria-label={favorited ? t("unfavorite") : t("favorite")}
      className={cn(
        "border-rule bg-surface flex size-8 items-center justify-center rounded-md border transition-colors",
        favorited ? "text-registry" : "text-ink-secondary hover:text-ink",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-registry/40",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill={favorited ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    </button>
  );
}
