"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { routing } from "@/i18n/routing";
import type { SignInState } from "./types";

const emailSchema = z.object({ email: z.email() });

function resolveLocale(value: FormDataEntryValue | null): string {
  return typeof value === "string" &&
    (routing.locales as readonly string[]).includes(value)
    ? value
    : routing.defaultLocale;
}

// Only allow same-origin path redirects to avoid an open redirect.
function resolveNext(value: FormDataEntryValue | null): string | undefined {
  return typeof value === "string" && value.startsWith("/") ? value : undefined;
}

// Server action for the login form. Sends an email magic link. Returns a
// NEUTRAL result: for any validly-formatted email it reports "sent" regardless
// of whether the account exists or the send succeeded, so account existence is
// never revealed. Only a malformed email yields "invalid".
export async function signInWithEmail(
  _prevState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const parsed = emailSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { status: "invalid" };
  }

  const locale = resolveLocale(formData.get("locale"));
  const nextPath = resolveNext(formData.get("next"));

  const requestHeaders = await headers();
  const proto = requestHeaders.get("x-forwarded-proto") ?? "http";
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const callbackUrl = new URL(`/${locale}/auth/callback`, `${proto}://${host}`);
  if (nextPath) {
    callbackUrl.searchParams.set("next", nextPath);
  }

  const supabase = await createClient();
  // Result intentionally ignored — see the neutral-response note above.
  await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: callbackUrl.toString() },
  });

  return { status: "sent" };
}

// Server action to sign out and return to the home route (the proxy localizes
// "/" to the default locale).
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
