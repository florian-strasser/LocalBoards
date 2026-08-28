// Two processes, one fresh database, started together.
//
// This is what CI does without meaning to: Playwright starts the server and its
// own setup script against the same empty database, and the server answers the
// readiness poll while it is still migrating. Both then read an empty
// `migrations` table and both start at `0001` — the slower one used to fail with
// `Duplicate entry '0001_baseline_schema' for key 'migrations.PRIMARY'`, having
// re-run migrations whose tables the other had already created. The same shape
// applies to a deployment that rolls a second replica.
//
// Requires a built app (`npm run build`) and the credentials in `.env.local`.
// Creates and drops a database of its own; it never touches an existing one.
import fs from "node:fs";
import { spawn } from "node:child_process";
import mysql from "mysql2/promise";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")]),
);
const DB = "lokalboards_migrationrace";
const PORTS = [3140, 3141];
const creds = {
  host: env.NUXT_MYSQL_HOST, user: env.NUXT_MYSQL_USER, password: env.NUXT_MYSQL_PASSWORD,
};

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`  ${ok ? "✓" : "✗"} ${name}${detail ? "  — " + detail : ""}`);
  if (!ok) failures++;
};

const admin = await mysql.createConnection(creds);
await admin.query(`DROP DATABASE IF EXISTS \`${DB}\``);
await admin.query(`CREATE DATABASE \`${DB}\``);
await admin.end();

const start = (port) => {
  const proc = spawn("node", [".output/server/index.mjs"], {
    env: { ...process.env, ...env, NUXT_MYSQL_DATABASE: DB, NUXT_MYSQL_SSL: "false",
           PORT: String(port), NITRO_PORT: String(port), NUXT_BOARDS_URL: `http://127.0.0.1:${port}` },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let out = "";
  for (const stream of [proc.stdout, proc.stderr]) stream.on("data", (d) => { out += d; });
  return { proc, out: () => out };
};

console.log("\n1. two servers migrate one empty database at the same time");
const servers = PORTS.map(start);
// Long enough for the slowest migration — the image conversions — to finish.
await new Promise((r) => setTimeout(r, 30000));
for (const { proc } of servers) proc.kill("SIGKILL");
const output = servers.map((s) => s.out()).join("");

check("neither hit a duplicate key", !/Duplicate entry .* for key 'migrations.PRIMARY'/.test(output),
  (/Duplicate entry [^"]*/.exec(output) || [""])[0]);
check("neither reported a failed migration", !/Database migration failed/.test(output));

const c = await mysql.createConnection({ ...creds, database: DB });
const [[{ n }]] = await c.query("SELECT COUNT(*) AS n FROM `migrations`");
const appliedLines = (output.match(/Applied database migration/g) || []).length;
check("every migration is recorded", n > 0, `${n} rows`);
check("and each was applied exactly once", appliedLines === n, `${appliedLines} applied, ${n} recorded`);

// The one that lost the race must have waited rather than skipped ahead: it sees
// the finished list and applies nothing.
const perServer = servers.map((s) => (s.out().match(/Applied database migration/g) || []).length);
check("one did the work, the other found it done", perServer.includes(0) && perServer.includes(n),
  perServer.join(" / "));

const [tables] = await c.query("SHOW TABLES");
check("the schema is there", tables.length > 10, `${tables.length} tables`);
await c.end();

const cleanup = await mysql.createConnection(creds);
await cleanup.query(`DROP DATABASE IF EXISTS \`${DB}\``);
await cleanup.end();

console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
process.exit(failures ? 1 : 0);
