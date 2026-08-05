import { z } from "zod";

// Client-safe variables. Each is referenced as a static
// `process.env.NEXT_PUBLIC_*` member so Next.js inlines the literal value into
// the browser bundle at build time.
const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_YANDEX_MAPS_API_KEY: z.string().min(1),
});

// ───────────────────────────────────────────────────────────────────────────
// SERVER-ONLY SECRETS BOUNDARY.
// Variables below are NOT prefixed with NEXT_PUBLIC_, so Next never inlines
// them into the client bundle. This schema is only parsed in a Node.js context
// (typeof window === "undefined"), so a missing secret can never crash the
// browser bundle. Never read these values from Client Components. The
// second, stronger guard lives in src/lib/supabase/server.ts, which imports
// the `server-only` package to turn any client import into a build error.
// ───────────────────────────────────────────────────────────────────────────
const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

function fail(scope: string, error: z.ZodError): never {
  const lines = error.issues.map(
    (issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`,
  );
  throw new Error(
    [
      `\n[env] Missing or invalid ${scope} environment variable(s):`,
      ...lines,
      "\nCopy .env.example to .env.local and fill in every value, then restart.\n",
    ].join("\n"),
  );
}

const client = clientSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_YANDEX_MAPS_API_KEY: process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY,
});
if (!client.success) {
  fail("client", client.error);
}

let server: z.infer<typeof serverSchema> | undefined;
if (typeof window === "undefined") {
  const parsed = serverSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
  if (!parsed.success) {
    fail("server", parsed.error);
  }
  server = parsed.data;
}

export const env = { ...client.data, ...(server ?? {}) } as z.infer<
  typeof clientSchema
> &
  z.infer<typeof serverSchema>;
