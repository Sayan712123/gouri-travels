#!/usr/bin/env node
/* ============================================================================
 * Gouri Travels — Supabase setup from the terminal
 * ============================================================================
 * Creates the tables, the is_admin() helper, the RLS policies and the
 * trip-photos storage bucket. Every statement is idempotent, so running it
 * again is harmless.
 *
 *   npm run supabase:setup          create / repair everything
 *   npm run supabase:check          only report what exists
 *
 * It needs ONE of these, in order of preference:
 *
 *   1. DATABASE_URL
 *        postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
 *        (Supabase → Project Settings → Database → Connection string → URI)
 *
 *   2. SUPABASE_DB_PASSWORD  (+ optional SUPABASE_PROJECT_REF)
 *        the database password from Project Settings → Database
 *
 *   3. SUPABASE_ACCESS_TOKEN (+ SUPABASE_PROJECT_REF)
 *        a personal access token from https://supabase.com/dashboard/account/tokens
 *        — this runs the SQL through the Management API, no password needed.
 *
 * Put them in a .env file next to this script (it is git-ignored) or export
 * them in your shell. Nothing is ever written back to disk or committed.
 * ========================================================================== */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const SQL_FILE = join(ROOT, "supabase", "setup.sql");

/* ---------------------------------------------------------------- env ---- */
function loadEnv() {
  const p = join(ROOT, ".env");
  if (!existsSync(p)) return;
  for (const raw of readFileSync(p, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 1) continue;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv();

const CHECK_ONLY = process.argv.includes("--check");
const PROJECT_REF =
  process.env.SUPABASE_PROJECT_REF ||
  (process.env.SUPABASE_URL || "").match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1] ||
  "kjoynpeidivqqanwfsno";

const C = {
  reset: "\x1b[0m", bold: "\x1b[1m", dim: "\x1b[2m",
  red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m", cyan: "\x1b[36m",
};
const ok = (m) => console.log(`${C.green}✓${C.reset} ${m}`);
const bad = (m) => console.log(`${C.red}✗${C.reset} ${m}`);
const info = (m) => console.log(`${C.cyan}•${C.reset} ${m}`);
const warn = (m) => console.log(`${C.yellow}!${C.reset} ${m}`);
const head = (m) => console.log(`\n${C.bold}${m}${C.reset}`);

/* ------------------------------------------------------------- helpers ---- */
function connectionString() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const pw = process.env.SUPABASE_DB_PASSWORD;
  if (!pw) return null;
  const region = process.env.SUPABASE_DB_REGION || "ap-south-1";
  const host = process.env.SUPABASE_DB_HOST || `aws-0-${region}.pooler.supabase.com`;
  return `postgresql://postgres.${PROJECT_REF}:${encodeURIComponent(pw)}@${host}:5432/postgres`;
}

async function runWithPg(sql) {
  let pg;
  try {
    pg = await import("pg");
  } catch {
    bad("The 'pg' package is not installed. Run:  npm install");
    process.exit(1);
  }
  const Client = pg.default?.Client || pg.Client;
  const client = new Client({
    connectionString: connectionString(),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}

async function runWithManagementApi(sql) {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    }
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`Management API ${res.status}: ${text.slice(0, 400)}`);
  return text;
}

/* --------------------------------------------------------------- check ---- */
async function checkTables() {
  const url = (process.env.SUPABASE_URL || `https://${PROJECT_REF}.supabase.co`).replace(/\/+$/, "");
  const key = process.env.SUPABASE_ANON_KEY;
  if (!key) {
    warn("SUPABASE_ANON_KEY is not set — skipping the table check.");
    return;
  }
  head("Checking tables");
  const tables = ["settings", "admins", "enquiries"];
  let missing = 0;
  for (const t of tables) {
    const res = await fetch(`${url}/rest/v1/${t}?select=*&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (res.ok) ok(`${t} — present`);
    else {
      missing++;
      bad(`${t} — missing (${res.status})`);
    }
  }
  const rpc = await fetch(`${url}/rest/v1/rpc/is_admin`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  if (rpc.ok) ok("is_admin() — present");
  else {
    missing++;
    bad(`is_admin() — missing (${rpc.status})`);
  }
  return missing;
}

/* ---------------------------------------------------------------- main ---- */
async function main() {
  console.log(`${C.bold}Gouri Travels — Supabase setup${C.reset}`);
  info(`project: ${PROJECT_REF}`);

  if (CHECK_ONLY) {
    const missing = await checkTables();
    console.log(
      missing
        ? `\n${C.yellow}${missing} item(s) missing.${C.reset} Run:  npm run supabase:setup`
        : `\n${C.green}Everything is in place.${C.reset}`
    );
    process.exit(missing ? 1 : 0);
  }

  if (!existsSync(SQL_FILE)) {
    bad(`Cannot find ${SQL_FILE}`);
    process.exit(1);
  }
  const sql = readFileSync(SQL_FILE, "utf8");

  const hasPg = Boolean(connectionString());
  const hasToken = Boolean(process.env.SUPABASE_ACCESS_TOKEN);

  if (!hasPg && !hasToken) {
    console.log(`
${C.yellow}No credentials found.${C.reset} Pick one of these and run again:

  ${C.bold}A. Database password${C.reset} (simplest)
     Supabase → Project Settings → Database → Database password
     then create a file named ${C.bold}.env${C.reset} in this folder:

       SUPABASE_DB_PASSWORD=your-database-password
       SUPABASE_PROJECT_REF=${PROJECT_REF}

  ${C.bold}B. Full connection string${C.reset}
     Supabase → Project Settings → Database → Connection string → URI

       DATABASE_URL=postgresql://postgres.${PROJECT_REF}:PASSWORD@aws-0-ap-south-1.pooler.supabase.com:5432/postgres

  ${C.bold}C. Personal access token${C.reset} (no password needed)
     https://supabase.com/dashboard/account/tokens

       SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxx
       SUPABASE_PROJECT_REF=${PROJECT_REF}

${C.dim}The .env file is git-ignored — it never leaves your machine.${C.reset}

${C.bold}Or skip the terminal entirely:${C.reset} open /admin/ → Supabase tab → copy the SQL
into the Supabase SQL editor. Same result, no credentials needed.
`);
    process.exit(2);
  }

  head("Applying schema");
  try {
    if (hasPg) {
      info("connecting with the database password…");
      await runWithPg(sql);
    } else {
      info("running through the Management API…");
      await runWithManagementApi(sql);
    }
    ok("schema applied");
  } catch (err) {
    bad(err.message);
    console.log(`
${C.yellow}If the connection was refused:${C.reset}
  • the database password is wrong, or
  • your network blocks port 5432 — use option C (access token) instead, or
  • paste supabase/setup.sql into the Supabase SQL editor.
`);
    process.exit(1);
  }

  head("Verifying");
  const missing = await checkTables();
  if (missing) {
    warn(`${missing} item(s) still missing — check the SQL output above.`);
    process.exit(1);
  }

  console.log(`
${C.green}${C.bold}Done.${C.reset} The database is ready.

Next:
  1. open /admin/ and sign in (email/password or Google)
  2. the panel will offer to add your email to the admins table
  3. edit anything and press Save changes
`);
}

main().catch((e) => {
  bad(e.message);
  process.exit(1);
});
