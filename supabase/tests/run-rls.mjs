// Runs supabase/tests/rls.sql against the linked Supabase project and fails
// loudly if any RLS assertion does not hold.
//
// Docker is not available in this environment, so the local Supabase stack and
// `supabase test db` (pgTAP) cannot be used. Instead we connect directly to the
// project's session pooler (IPv4, port 5432 — it supports `set local role` and
// transactions) and execute the proof, which is wrapped in a single
// transaction that is always rolled back.
//
// Usage: npm run test:rls   (loads SUPABASE_DB_PASSWORD from .env.local)

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import pg from "pg";

const password = process.env.SUPABASE_DB_PASSWORD;
if (!password) {
  console.error(
    "SUPABASE_DB_PASSWORD is not set. Add it to .env.local (the project's " +
      "database password from the Supabase dashboard).",
  );
  process.exit(1);
}

// The pooler connection template is written by `supabase link` into
// supabase/.temp/pooler-url. It has no password; we inject it below.
const poolerUrlPath = fileURLToPath(
  new URL("../.temp/pooler-url", import.meta.url),
);
const poolerUrl = readFileSync(poolerUrlPath, "utf8").trim();
const u = new URL(poolerUrl);

const client = new pg.Client({
  host: u.hostname,
  port: Number(u.port),
  user: decodeURIComponent(u.username),
  password,
  database: u.pathname.replace(/^\//, ""),
  ssl: { rejectUnauthorized: false },
});

const sql = readFileSync(
  fileURLToPath(new URL("./rls.sql", import.meta.url)),
  "utf8",
);

try {
  await client.connect();
  await client.query(sql);
  console.log("✓ All RLS assertions passed.");
} catch (err) {
  console.error("✗ RLS test failed:");
  console.error(err.message);
  process.exitCode = 1;
} finally {
  // Ensure nothing is left in a transaction, whatever happened above.
  try {
    await client.query("rollback");
  } catch {
    // no transaction in progress — fine
  }
  await client.end();
}
