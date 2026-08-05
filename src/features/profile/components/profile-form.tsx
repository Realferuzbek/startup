"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { updateProfile } from "@/features/profile/actions";
import type { ProfileFormState } from "@/features/profile/schema";
import { formatUzPhone } from "@/lib/phone";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

const initialState: ProfileFormState = { status: "idle" };

const FIELD_KEYS = [
  "fullNameInvalid",
  "phoneInvalid",
  "telegramInvalid",
  "phoneTaken",
];
const fieldLabel = "text-small text-ink-secondary";

export function ProfileForm({
  initialFullName,
  initialPhone,
  initialTelegram,
}: {
  initialFullName: string;
  initialPhone: string;
  initialTelegram: string;
}) {
  const t = useTranslations("profile");
  const [state, formAction, pending] = useActionState(
    updateProfile,
    initialState,
  );

  const err = state.status === "error" ? state.error : null;
  const has = (key: string) => err === key;
  const fieldMsg = (key: string) =>
    has(key) ? <p className="text-caption text-danger">{t(key)}</p> : null;

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      {state.status === "saved" ? (
        <Alert variant="info">{t("saved")}</Alert>
      ) : null}
      {err && !FIELD_KEYS.includes(err) ? (
        <Alert variant="danger">{t(err)}</Alert>
      ) : null}

      <label className="flex flex-col gap-1.5">
        <span className={fieldLabel}>{t("fullNameLabel")}</span>
        <Input
          name="full_name"
          required
          defaultValue={initialFullName}
          aria-invalid={has("fullNameInvalid") || undefined}
        />
        {fieldMsg("fullNameInvalid")}
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={fieldLabel}>{t("phoneLabel")}</span>
        <Input
          name="phone"
          type="tel"
          required
          inputMode="tel"
          autoComplete="tel"
          defaultValue={initialPhone ? formatUzPhone(initialPhone) : ""}
          aria-invalid={has("phoneInvalid") || has("phoneTaken") || undefined}
        />
        {fieldMsg("phoneInvalid")}
        {fieldMsg("phoneTaken")}
        <span className="text-caption text-ink-muted">{t("phoneHelp")}</span>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={fieldLabel}>{t("telegramLabel")}</span>
        <Input
          name="telegram_username"
          defaultValue={initialTelegram}
          aria-invalid={has("telegramInvalid") || undefined}
        />
        {fieldMsg("telegramInvalid")}
        <span className="text-caption text-ink-muted">{t("telegramHelp")}</span>
      </label>

      <Button type="submit" loading={pending}>
        {t("save")}
      </Button>
    </form>
  );
}
