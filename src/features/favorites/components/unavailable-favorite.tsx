"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { toggleFavorite } from "@/features/favorites/actions";
import { PhotoPlaceholder } from "@/features/discovery/components/photo-placeholder";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// A favorited listing that is no longer publicly visible: shown (not hidden),
// marked unavailable, with a remove control that optimistically drops it.
export function UnavailableFavorite({
  listingId,
  title,
  price,
  location,
  coverUrl,
}: {
  listingId: string;
  title: string;
  price: string;
  location: string;
  coverUrl: string | null;
}) {
  const t = useTranslations("favorites");
  const [removed, setRemoved] = useState(false);
  const [pending, startTransition] = useTransition();

  if (removed) return null;

  function remove() {
    setRemoved(true);
    startTransition(async () => {
      const res = await toggleFavorite(listingId);
      if ("error" in res) setRemoved(false);
    });
  }

  return (
    <div className="border-rule bg-surface flex flex-col gap-2 rounded-md border p-2">
      <div className="bg-rule relative aspect-[4/3] w-full overflow-hidden rounded-md">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 380px"
            className="object-cover opacity-60 grayscale"
          />
        ) : (
          <PhotoPlaceholder />
        )}
      </div>
      <div className="flex items-start justify-between gap-2">
        <span className="text-body text-ink-secondary line-clamp-1 font-medium">
          {title}
        </span>
        <Badge variant="warning" className="shrink-0">
          {t("unavailable")}
        </Badge>
      </div>
      <p className="text-price text-ink-secondary font-mono">{price}</p>
      <p className="text-small text-ink-muted">{location}</p>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={remove}
        disabled={pending}
        className="mt-1 self-start"
      >
        {t("remove")}
      </Button>
    </div>
  );
}
