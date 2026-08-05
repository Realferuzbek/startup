// Ad-hoc read-only query helper against the linked project's session pooler.
// Reuses run-rls.mjs's credential handling (never inlines a connection string).
//
// Usage: node --env-file=.env.local supabase/tests/query.mjs "select 1"

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import pg from "pg";

const password = process.env.SUPABASE_DB_PASSWORD;
if (!password) {
  console.error("SUPABASE_DB_PASSWORD is not set.");
  process.exit(1);
}

const poolerUrl = readFileSync(
  fileURLToPath(new URL("../.temp/pooler-url", import.meta.url)),
  "utf8",
).trim();
const u = new URL(poolerUrl);

const client = new pg.Client({
  host: u.hostname,
  port: Number(u.port),
  user: decodeURIComponent(u.username),
  password,
  database: u.pathname.replace(/^\//, ""),
  ssl: { rejectUnauthorized: false },
});

let sql = process.argv[2];
if (!sql) {
  console.error(
    "Pass a SQL statement (or @path/to/file) as the first argument.",
  );
  process.exit(1);
}
if (sql.startsWith("@")) {
  sql = readFileSync(
    fileURLToPath(new URL("./" + sql.slice(1), import.meta.url)),
    "utf8",
  );
}

try {
  await client.connect();
  const res = await client.query(sql);
  console.log(JSON.stringify(res.rows, null, 2));
} catch (err) {
  console.error("QUERY ERROR:", err.message);
  if (err.where) console.error("WHERE:", err.where);
  if (err.detail) console.error("DETAIL:", err.detail);
  if (err.hint) console.error("HINT:", err.hint);
  if (err.position) console.error("POSITION:", err.position);
  process.exitCode = 1;
} finally {
  try {
    await client.query("rollback");
  } catch {
    /* no txn */
  }
  await client.end();
}
