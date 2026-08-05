import "server-only";

// One place to record why a server action refused, because the user only ever
// sees a translated sentence. Without this, a database rejection reaches the
// host as "Xatolik yuz berdi" and leaves nothing behind to diagnose it with —
// which is exactly how a posting failure became unexplainable in production.
//
// Netlify (and `next start`) capture stderr per invocation, so a single-line
// JSON record is greppable in the function log without any extra service.

type PostgrestLikeError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

// Context values are shaped by the caller. NEVER pass user-identifying data:
// ids and enum-ish values only, never a phone, name, address or file content.
type Context = Record<string, string | number | boolean | null | undefined>;

function describe(error: unknown): PostgrestLikeError {
  if (error && typeof error === "object") {
    const e = error as PostgrestLikeError;
    if (e.code || e.message) {
      return {
        code: e.code ?? null,
        message: e.message ?? null,
        details: e.details ?? null,
        hint: e.hint ?? null,
      };
    }
  }
  if (error instanceof Error) {
    return { code: error.name, message: error.message };
  }
  return { message: String(error) };
}

// `scope` identifies the action and the step inside it, e.g.
// "properties.create/rpc" — so a log line points at one call site.
export function logActionError(
  scope: string,
  error: unknown,
  context: Context = {},
): void {
  console.error(
    "[action-error] " +
      JSON.stringify({ scope, ...describe(error), ...context }),
  );
}
