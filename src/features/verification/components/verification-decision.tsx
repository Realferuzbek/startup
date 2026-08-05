"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { decideVerification } from "@/features/verification/actions";
import type { DecideState } from "@/features/verification/schema";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

const initialState: DecideState = { status: "idle" };

const REASONS = [
  "name_mismatch",
  "unreadable",
  "wrong_document",
  "cadastral_mismatch",
  "other",
] as const;

const fieldLabel = "text-small text-ink-secondary";

export function VerificationDecision({
  verificationId,
}: {
  verificationId: string;
}) {
  const t = useTranslations("admin");
  const [state, formAction, pending] = useActionState(
    decideVerification,
    initialState,
  );

  const err = state.status === "error" ? state.error : null;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="verification_id" value={verificationId} />

      <p className="text-body text-ink font-medium">{t("nameMatchPrompt")}</p>

      {err ? <Alert variant="danger">{t(err)}</Alert> : null}

      <label className="flex flex-col gap-1.5">
        <span className={fieldLabel}>{t("rejectReason")}</span>
        <Select name="reason" defaultValue="">
          <option value="" disabled>
            {t("rejectReasonPlaceholder")}
          </option>
          {REASONS.map((r) => (
            <option key={r} value={r}>
              {t(`reason.${r}`)}
            </option>
          ))}
        </Select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={fieldLabel}>{t("rejectNote")}</span>
        <Textarea name="note" rows={3} />
      </label>

      <div className="flex flex-wrap gap-3">
        <Button
          type="submit"
          name="decision"
          value="approve"
          variant="primary"
          loading={pending}
        >
          {t("approve")}
        </Button>
        <Button
          type="submit"
          name="decision"
          value="reject"
          variant="destructive"
          loading={pending}
        >
          {t("reject")}
        </Button>
      </div>
    </form>
  );
}
