import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { routing } from "@/i18n/routing";
import { env } from "@/lib/env";

// Next.js 16 renamed the `middleware` file convention to `proxy`. A
// `middleware.ts` file is NOT loaded by this version — all request-time logic
// lives here.
//
// This proxy runs TWO concerns on every matched request and merges them into a
// single response:
//   1. Supabase session refresh (reads/writes auth cookies)
//   2. next-intl locale routing (may issue a redirect)
// The cookie-survival merge below is the most important correctness property:
// without it, the just-refreshed session is dropped on every locale redirect.

const handleI18nRouting = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
  // Base response that Supabase writes any refreshed session cookies onto. The
  // cookie methods read the incoming request cookies and write updates to BOTH
  // the request (so anything downstream in this pass sees them) and this
  // response object.
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh/validate the session. getUser() (never getSession) validates the
  // token with the auth server and triggers a refresh when needed, writing new
  // cookies through setAll above. Do not put logic between client creation and
  // this call.
  await supabase.auth.getUser();

  // next-intl locale routing. This may return a brand-new redirect response
  // (e.g. "/" -> "/uz") that carries NONE of the auth cookies set above, or a
  // rewrite/next response for an actual page render.
  const response = handleI18nRouting(request);

  // MERGE — the cookie-survival mechanism. Copy every auth cookie Supabase set
  // onto whatever response next-intl produced. Without this, a locale redirect
  // silently drops the refreshed session on every request.
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie);
  });

  // Expose the current pathname to Server Components (used by requireUser() to
  // build the post-login "next" destination). For non-redirect responses,
  // next-intl forwards request headers via Next's x-middleware-override-headers
  // mechanism; append x-pathname to that set so it reaches the rendered route.
  const overrideHeaders = response.headers.get("x-middleware-override-headers");
  if (overrideHeaders) {
    response.headers.set(
      "x-middleware-override-headers",
      `${overrideHeaders},x-pathname`,
    );
    response.headers.set(
      "x-middleware-request-x-pathname",
      request.nextUrl.pathname,
    );
  }

  return response;
}

export const config = {
  // Run on every path except API routes, Next.js internals, and any request for
  // a file with an extension (favicon.ico, images, etc.). This still matches
  // "/", which is what triggers the redirect to "/uz".
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
