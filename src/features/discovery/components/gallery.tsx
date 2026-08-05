"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { PhotoPlaceholder } from "@/features/discovery/components/photo-placeholder";

const arrow =
  "bg-surface border-rule text-ink absolute top-1/2 flex size-8 -translate-y-1/2 " +
  "items-center justify-center rounded-md border transition-colors hover:border-ink-muted " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-registry/40";

// Keyboard-navigable photo gallery. Arrow keys move between photos while the
// gallery is focused (a scoped handler, not a global window listener), plus
// on-screen controls and thumbnails. All images via next/image with responsive
// sizes. Zero photos → a neutral placeholder, never an empty container.
export function Gallery({ photos }: { photos: { url: string }[] }) {
  const t = useTranslations("discovery");
  const [index, setIndex] = useState(0);
  const count = photos.length;

  const go = useCallback(
    (delta: number) =>
      setIndex((i) => (count === 0 ? 0 : (i + delta + count) % count)),
    [count],
  );

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(-1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      go(1);
    }
  }

  if (count === 0) {
    return (
      <div className="bg-rule relative aspect-[4/3] w-full overflow-hidden rounded-md">
        <PhotoPlaceholder />
      </div>
    );
  }

  const active = photos[Math.min(index, count - 1)]!;

  return (
    <div
      role="group"
      aria-label={t("gallery")}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="flex flex-col gap-2 rounded-md focus-visible:ring-2 focus-visible:ring-registry/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper focus-visible:outline-none"
    >
      <div className="bg-rule relative aspect-[4/3] w-full overflow-hidden rounded-md">
        <Image
          src={active.url}
          alt=""
          fill
          sizes="(max-width: 1024px) 100vw, 760px"
          className="object-contain"
          priority
        />
        {count > 1 ? (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label={t("prev")}
              className={`${arrow} left-2`}
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label={t("next")}
              className={`${arrow} right-2`}
            >
              ›
            </button>
          </>
        ) : null}
      </div>

      {count > 1 ? (
        <div className="flex gap-2 overflow-x-auto">
          {photos.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`${i + 1}`}
              aria-current={i === index ? "true" : undefined}
              className={`relative h-16 w-20 shrink-0 overflow-hidden rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-registry/40 ${
                i === index
                  ? "border-registry ring-registry ring-2"
                  : "border-rule"
              }`}
            >
              <Image
                src={p.url}
                alt=""
                fill
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
