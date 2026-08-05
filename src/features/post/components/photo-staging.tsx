"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const MAX_PHOTOS = 15;

// A photo chosen but not yet uploaded. Photos need a property_id for their
// storage path and for Storage RLS, and on a new post no property exists until
// the submit runs — so files are held here, previewed from an object URL, and
// uploaded as phase 3 of the single submit.
//
// `uploaded` survives a failed run: on retry the orchestrator skips the files
// that already landed, so a partial upload is never repeated.
export type StagedPhoto = {
  id: string;
  file: File;
  url: string;
  uploaded: boolean;
};

export function makeStagedPhoto(file: File): StagedPhoto {
  return {
    id: crypto.randomUUID(),
    file,
    url: URL.createObjectURL(file),
    uploaded: false,
  };
}

export function PhotoStaging({
  photos,
  onChange,
  disabled = false,
}: {
  photos: StagedPhoto[];
  onChange: (next: StagedPhoto[]) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("photo");
  const inputRef = useRef<HTMLInputElement>(null);

  const atLimit = photos.length >= MAX_PHOTOS;

  function add(fileList: FileList) {
    const room = MAX_PHOTOS - photos.length;
    const added = Array.from(fileList).slice(0, room).map(makeStagedPhoto);
    onChange([...photos, ...added]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function swap(i: number, j: number) {
    if (j < 0 || j >= photos.length) return;
    const next = [...photos];
    const a = next[i];
    const b = next[j];
    if (!a || !b) return;
    next[i] = b;
    next[j] = a;
    onChange(next);
  }

  function setCover(i: number) {
    const next = [...photos];
    const [moved] = next.splice(i, 1);
    if (!moved) return;
    next.unshift(moved);
    onChange(next);
  }

  function remove(i: number) {
    const target = photos[i];
    if (target) URL.revokeObjectURL(target.url);
    onChange(photos.filter((_, idx) => idx !== i));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>{t("uploadPrompt")}</Label>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={disabled || atLimit}
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0)
              add(e.target.files);
          }}
          className="text-small text-ink-secondary file:border-rule-strong file:bg-surface file:text-ink file:text-small file:mr-3 file:rounded-md file:border file:px-3 file:py-1.5 disabled:opacity-60"
        />
        {atLimit ? (
          <p className="text-small text-warning">{t("tooManyPhotos")}</p>
        ) : null}
      </div>

      {photos.length === 0 ? (
        <p className="text-small text-ink-secondary">{t("noPhotosWarning")}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo, i) => (
            <li
              key={photo.id}
              className="border-rule flex flex-col gap-2 rounded-md border p-2"
            >
              {/* A blob: URL cannot go through next/image — no loader, no
                  remote pattern, and nothing to optimize for a local preview. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt=""
                className="bg-rule aspect-[4/3] w-full rounded-md object-cover"
              />
              {i === 0 ? (
                <Badge variant="neutral" className="self-start">
                  {t("cover")}
                </Badge>
              ) : null}
              <div className="flex flex-wrap gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={i === 0 || disabled}
                  onClick={() => swap(i, i - 1)}
                >
                  {t("moveUp")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={i === photos.length - 1 || disabled}
                  onClick={() => swap(i, i + 1)}
                >
                  {t("moveDown")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={i === 0 || disabled}
                  onClick={() => setCover(i)}
                >
                  {t("setCover")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={disabled}
                  onClick={() => remove(i)}
                >
                  {t("delete")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
