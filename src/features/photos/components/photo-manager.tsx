"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { prepareImage } from "@/features/photos/image-prep";
import {
  uploadPropertyPhoto,
  deletePropertyPhoto,
  reorderPropertyPhotos,
} from "@/features/photos/actions";
import type { PropertyPhoto } from "@/features/photos/queries";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";

const MAX_PHOTOS = 15;

type FileStatus = {
  name: string;
  state: "uploading" | "done" | "error";
  error?: string;
};

export function PhotoManager({
  propertyId,
  photos,
}: {
  propertyId: string;
  photos: PropertyPhoto[];
}) {
  const t = useTranslations("photo");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [statuses, setStatuses] = useState<FileStatus[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const atLimit = photos.length >= MAX_PHOTOS;

  async function onFiles(fileList: FileList) {
    setBusy(true);
    const files = Array.from(fileList);
    setStatuses(files.map((f) => ({ name: f.name, state: "uploading" })));

    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      try {
        const { blob, type } = await prepareImage(file);
        const ext = type === "image/webp" ? "webp" : "jpg";
        const fd = new FormData();
        fd.set("property_id", propertyId);
        fd.set("file", new File([blob], `photo.${ext}`, { type }));
        const res = await uploadPropertyPhoto(fd);
        setStatuses((prev) =>
          prev.map((s, idx) =>
            idx === i
              ? { ...s, state: res.ok ? "done" : "error", error: res.error }
              : s,
          ),
        );
      } catch (e) {
        const error = e instanceof Error ? e.message : "uploadFailed";
        setStatuses((prev) =>
          prev.map((s, idx) =>
            idx === i ? { ...s, state: "error", error } : s,
          ),
        );
      }
    }

    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  function reorderTo(newIds: string[]) {
    startTransition(async () => {
      await reorderPropertyPhotos(propertyId, newIds);
      router.refresh();
    });
  }

  function moveUp(i: number) {
    if (i <= 0) return;
    const ids = photos.map((p) => p.id);
    const a = ids[i];
    const b = ids[i - 1];
    if (a === undefined || b === undefined) return;
    ids[i] = b;
    ids[i - 1] = a;
    reorderTo(ids);
  }

  function moveDown(i: number) {
    if (i >= photos.length - 1) return;
    const ids = photos.map((p) => p.id);
    const a = ids[i];
    const b = ids[i + 1];
    if (a === undefined || b === undefined) return;
    ids[i] = b;
    ids[i + 1] = a;
    reorderTo(ids);
  }

  function setCover(i: number) {
    const ids = photos.map((p) => p.id);
    const [id] = ids.splice(i, 1);
    if (id === undefined) return;
    ids.unshift(id);
    reorderTo(ids);
  }

  function remove(id: string) {
    setDeleteError(null);
    startTransition(async () => {
      const res = await deletePropertyPhoto(id);
      if (res.ok) {
        setConfirmDelete(null);
        router.refresh();
      } else {
        setDeleteError(res.error ?? "uploadFailed");
      }
    });
  }

  return (
    <section className="mt-8 flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>{t("uploadPrompt")}</Label>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={busy || atLimit}
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              void onFiles(e.target.files);
            }
          }}
          className="text-small text-ink-secondary file:border-rule-strong file:bg-surface file:text-ink file:text-small file:mr-3 file:rounded-md file:border file:px-3 file:py-1.5 disabled:opacity-60"
        />
        {atLimit ? (
          <p className="text-small text-warning">{t("tooManyPhotos")}</p>
        ) : null}
      </div>

      {statuses.length > 0 ? (
        <ul className="text-small text-ink-secondary flex flex-col gap-1">
          {statuses.map((s, i) => (
            <li key={i}>
              {s.name} —{" "}
              {s.state === "uploading"
                ? t("uploading")
                : s.state === "done"
                  ? "✓"
                  : t(s.error ?? "uploadFailed")}
            </li>
          ))}
        </ul>
      ) : null}

      {deleteError ? <Alert variant="danger">{t(deleteError)}</Alert> : null}

      {photos.length === 0 ? (
        <p className="text-small text-ink-secondary">{t("noPhotosWarning")}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo, i) => (
            <li
              key={photo.id}
              className="border-rule flex flex-col gap-2 rounded-md border p-2"
            >
              <Image
                src={photo.url}
                alt=""
                width={160}
                height={160}
                sizes="(max-width: 640px) 45vw, 160px"
                className="bg-rule h-40 w-full rounded-md object-cover"
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
                  disabled={i === 0 || isPending}
                  onClick={() => moveUp(i)}
                >
                  {t("moveUp")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={i === photos.length - 1 || isPending}
                  onClick={() => moveDown(i)}
                >
                  {t("moveDown")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={i === 0 || isPending}
                  onClick={() => setCover(i)}
                >
                  {t("setCover")}
                </Button>
              </div>
              {confirmDelete === photo.id ? (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-caption text-ink-secondary">
                    {t("deleteConfirm")}
                  </span>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={isPending}
                    onClick={() => remove(photo.id)}
                  >
                    {t("delete")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmDelete(null)}
                  >
                    {t("cancel")}
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmDelete(photo.id)}
                >
                  {t("delete")}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
