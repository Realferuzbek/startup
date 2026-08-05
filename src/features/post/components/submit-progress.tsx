"use client";

import { useTranslations } from "next-intl";

export type PhaseKey = "contact" | "property" | "photos" | "publish";
export type PhaseState = "pending" | "running" | "done" | "failed";

export type Phase = {
  key: PhaseKey;
  state: PhaseState;
  /** Photos only: how many of how many have landed. */
  done?: number;
  total?: number;
};

const LABEL: Record<PhaseKey, string> = {
  contact: "stepContact",
  property: "stepProperty",
  photos: "stepPhotos",
  publish: "stepPublish",
};

// One user action, four phases — the sequence is forced by the data model, so
// the least it can do is say where it is. Marks are text, not spinners: the
// primary button already carries the only motion on the page.
export function SubmitProgress({ phases }: { phases: Phase[] }) {
  const t = useTranslations("post");

  return (
    <ol
      aria-live="polite"
      className="border-rule bg-surface flex flex-col gap-2 rounded-md border p-4"
    >
      {phases.map((phase) => {
        const color =
          phase.state === "failed"
            ? "text-danger"
            : phase.state === "done"
              ? "text-ink"
              : phase.state === "running"
                ? "text-registry"
                : "text-ink-muted";
        return (
          <li
            key={phase.key}
            className={`text-small flex items-center gap-2 ${color}`}
          >
            <span aria-hidden="true" className="w-4 shrink-0 text-center">
              {phase.state === "done"
                ? "✓"
                : phase.state === "failed"
                  ? "×"
                  : phase.state === "running"
                    ? "›"
                    : "·"}
            </span>
            <span>{t(LABEL[phase.key])}</span>
            {phase.total !== undefined ? (
              <span className="text-ink-muted font-mono">
                {t("photoProgress", {
                  done: phase.done ?? 0,
                  total: phase.total,
                })}
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
