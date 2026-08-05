"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { submitVerification } from "@/features/verification/actions";
import type { SubmitState } from "@/features/verification/schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

const initialState: SubmitState = { status: "idle" };

// Keys that highlight a specific field rather than the form as a whole.
const CADASTRAL_KEYS = ["cadastralInvalid"];
const DOCUMENT_KEYS = ["documentRequired", "wrongFileType", "fileTooLarge"];
const FIELD_KEYS = [...CADASTRAL_KEYS, ...DOCUMENT_KEYS];

const fieldLabel = "text-small text-ink-secondary";

export function VerifyForm({ propertyId }: { propertyId: string }) {
  const t = useTranslations("verification");
  const [state, formAction, pending] = useActionState(
    submitVerification,
    initialState,
  );

  const err = state.status === "error" ? state.error : null;
  const has = (key: string) => err === key;
  const fieldMsg = (keys: string[]) =>
    err && keys.includes(err) ? (
      <p className="text-caption text-danger">{t(err)}</p>
    ) : null;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="property_id" value={propertyId} />

      {err && !FIELD_KEYS.includes(err) ? (
        <Alert variant="danger">{t(err)}</Alert>
      ) : null}

      <label className="flex flex-col gap-1.5">
        <span className={fieldLabel}>{t("cadastralLabel")}</span>
        <Input
          name="cadastral_number"
          required
          inputMode="numeric"
          className="font-mono"
          placeholder="00:00:00:00:0000"
          aria-invalid={has("cadastralInvalid") || undefined}
        />
        {fieldMsg(CADASTRAL_KEYS)}
        <span className="text-caption text-ink-muted">
          {t("cadastralHelp")}
        </span>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={fieldLabel}>{t("documentLabel")}</span>
        <input
          type="file"
          name="document"
          required
          accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
          className="text-small text-ink-secondary file:border-rule-strong file:bg-surface file:text-ink file:text-small file:mr-3 file:rounded-md file:border file:px-3 file:py-1.5"
          aria-invalid={DOCUMENT_KEYS.some((k) => has(k)) || undefined}
        />
        {fieldMsg(DOCUMENT_KEYS)}
        <span className="text-caption text-ink-muted">{t("documentHelp")}</span>
      </label>

      <Button type="submit" loading={pending} className="self-start">
        {t("submit")}
      </Button>
    </form>
  );
}
