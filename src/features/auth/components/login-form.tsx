"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { signInWithEmail } from "@/features/auth/actions";
import type { SignInState } from "@/features/auth/types";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

type Props = {
  locale: string;
  next?: string;
  hasError?: boolean;
};

const initialState: SignInState = { status: "idle" };

export function LoginForm({ locale, next, hasError }: Props) {
  const t = useTranslations("auth");
  const [state, formAction, pending] = useActionState(
    signInWithEmail,
    initialState,
  );

  if (state.status === "sent") {
    return (
      <Card className="w-full p-6 md:p-8">
        <Alert variant="info">{t("checkInbox")}</Alert>
      </Card>
    );
  }

  const showError = hasError || state.status === "invalid";

  return (
    <Card className="w-full p-6 md:p-8">
      <form action={formAction} className="flex flex-col gap-4">
        <h1 className="text-h2 text-ink">{t("loginTitle")}</h1>

        {showError ? <Alert variant="danger">{t("error")}</Alert> : null}

        <div className="flex flex-col gap-1">
          <Label htmlFor="email">{t("emailLabel")}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
          />
        </div>

        <input type="hidden" name="locale" value={locale} />
        {next ? <input type="hidden" name="next" value={next} /> : null}

        <Button type="submit" loading={pending} className="w-full">
          {t("submit")}
        </Button>
      </form>
    </Card>
  );
}
