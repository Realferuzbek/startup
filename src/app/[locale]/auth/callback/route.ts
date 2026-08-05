import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Auth callback for the email magic link. This is a Route Handler, never a
// page — it renders no UI. Supabase redirects the magic link here with a
// `code`; we exchange it for a session and then redirect into the app.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // Only allow same-origin path redirects to avoid an open-redirect. Anything
  // else falls back to the locale home.
  const nextParam = searchParams.get("next");
  const safeNext =
    nextParam && nextParam.startsWith("/") ? nextParam : `/${locale}`;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(safeNext, origin));
    }
  }

  // No code, or the exchange failed. Redirect to login with a generic error
  // indicator — never leak the raw error into the URL.
  return NextResponse.redirect(new URL(`/${locale}/login?error=auth`, origin));
}
