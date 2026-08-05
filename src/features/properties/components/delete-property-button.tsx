"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { deleteProperty } from "@/features/properties/actions";
import type { PropertyFormState } from "@/features/properties/schema";
import { Button } from "@/components/ui/button";

const initialState: PropertyFormState = { status: "idle" };

export function DeletePropertyButton({ id }: { id: string }) {
  const t = useTranslations("property");
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, pending] = useActionState(
    deleteProperty,
    initialState,
  );

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={() => setConfirming(true)}
      >
        {t("delete")}
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <form action={formAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={id} />
        <span className="text-small text-ink-secondary">
          {t("deleteConfirm")}
        </span>
        <Button type="submit" variant="destructive" size="sm" loading={pending}>
          {t("delete")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setConfirming(false)}
        >
          {t("cancel")}
        </Button>
      </form>
      {state.status === "error" && state.error ? (
        <span role="alert" className="text-caption text-danger">
          {t(state.error)}
        </span>
      ) : null}
    </div>
  );
}
