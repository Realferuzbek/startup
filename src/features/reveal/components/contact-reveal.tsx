"use client";

import { useActionState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { revealContact, type RevealState } from "@/features/reveal/actions";
import type { OwnerContact } from "@/features/reveal/queries";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { formatUzPhone } from "@/lib/phone";

const initial: RevealState = { status: "idle" };
const panel =
  "border-rule bg-surface flex flex-col gap-3 rounded-md border p-4";
const linkCls =
  "text-registry underline rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-registry/40";

export function ContactReveal({
  signedIn,
  locale,
  listingId,
  revealCount,
  initialContact,
}: {
  signedIn: boolean;
  locale: string;
  listingId: string;
  revealCount: number;
  initialContact: OwnerContact | null;
}) {
  const t = useTranslations("reveal");
  const [state, formAction, pending] = useActionState(revealContact, initial);
  const pathname = usePathname();
  const router = useRouter();
  // Leaving for the login page is a navigation, not a form post — it needs its
  // own pending state or the button looks dead on a slow connection.
  const [leaving, startLeaving] = useTransition();

  // Shown contact: an existing reveal (server-provided) or this session's reveal.
  const contact =
    initialContact ?? (state.status === "revealed" ? state.contact : null);

  function goLogin() {
    startLeaving(() =>
      router.push(`/${locale}/login?next=${encodeURIComponent(pathname)}`),
    );
  }

  if (contact) {
    return (
      <div className={panel}>
        <h2 className="text-h3 text-ink">{t("revealedTitle")}</h2>
        <dl className="text-small flex flex-col gap-1">
          {contact.full_name ? (
            <div className="flex gap-2">
              <dt className="text-ink-muted">{t("name")}</dt>
              <dd className="text-ink">{contact.full_name}</dd>
            </div>
          ) : null}
          {contact.phone ? (
            <div className="flex gap-2">
              <dt className="text-ink-muted">{t("phone")}</dt>
              <dd>
                <a
                  href={`tel:${contact.phone}`}
                  className={`${linkCls} font-mono`}
                >
                  {formatUzPhone(contact.phone)}
                </a>
              </dd>
            </div>
          ) : null}
          {contact.telegram_username ? (
            <div className="flex gap-2">
              <dt className="text-ink-muted">{t("telegram")}</dt>
              <dd>
                <a
                  href={`https://t.me/${contact.telegram_username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkCls}
                >
                  @{contact.telegram_username}
                </a>
              </dd>
            </div>
          ) : null}
        </dl>
        <p className="text-caption text-ink-muted">
          {t("count", { count: revealCount })}
        </p>
      </div>
    );
  }

  return (
    <div className={panel}>
      {state.status === "error" ? (
        <Alert variant={state.error === "rateLimited" ? "warning" : "danger"}>
          {t(state.error)}
        </Alert>
      ) : null}
      {signedIn ? (
        <form action={formAction}>
          <input type="hidden" name="id" value={listingId} />
          <Button type="submit" loading={pending} className="w-full">
            {t("cta")}
          </Button>
        </form>
      ) : (
        <>
          <p className="text-small text-ink-secondary">{t("signedOutHelp")}</p>
          <Button
            type="button"
            onClick={goLogin}
            loading={leaving}
            className="w-full"
          >
            {t("signIn")}
          </Button>
        </>
      )}
      <p className="text-caption text-ink-muted">
        {t("count", { count: revealCount })}
      </p>
    </div>
  );
}
