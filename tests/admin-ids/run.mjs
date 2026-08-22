// The admin endpoints that act on a stored id used to demand a UUID. An
// instance that was running before v0.10.0 — when better-auth was replaced —
// still holds accounts whose ids better-auth minted, and those are 32
// alphanumeric characters with no hyphens. This checks that such an account can
// be impersonated, edited and deleted, and that the looser check did not turn
// into no check at all.
import mysql from "mysql2/promise";
import { spawn } from "node:child_process";
import fs from "node:fs";
import crypto from "node:crypto";

const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split("\n")
  .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
  .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")]));
const db = () => mysql.createConnection({ host: env.NUXT_MYSQL_HOST, user: env.NUXT_MYSQL_USER, password: env.NUXT_MYSQL_PASSWORD, database: env.NUXT_MYSQL_DATABASE });

const sweep = async () => {
  const c = await db();
  for (const t of ["session", "account"]) {
    await c.execute(`DELETE FROM \`${t}\` WHERE userId IN (SELECT id FROM \`user\` WHERE email LIKE '%@example.test')`);
  }
  await c.execute("DELETE FROM `user` WHERE email LIKE '%@example.test'");
  await c.end();
};

const PORT = Number(process.env.ADMIN_TEST_PORT || 3109);
const BASE = `http://127.0.0.1:${PORT}`;

async function startApp() {
  const child = spawn("node", [".output/server/index.mjs"], {
    env: { ...process.env, ...env, PORT: String(PORT), NUXT_BOARDS_URL: BASE, NUXT_MYSQL_SSL: "false", NUXT_PUBLIC_SIGNUP: "true" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const logs = [];
  child.stdout.on("data", (d) => logs.push(String(d)));
  child.stderr.on("data", (d) => logs.push(String(d)));
  for (let i = 0; i < 120; i++) {
    if (child.exitCode !== null) throw new Error("app exited while starting:\n" + logs.join(""));
    try { if ((await fetch(BASE + "/")).ok) return { child, logs }; } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("app did not start:\n" + logs.join(""));
}
const stopApp = (app) => new Promise((resolve) => {
  if (app.child.exitCode !== null) return resolve();
  app.child.once("exit", resolve);
  app.child.kill("SIGTERM");
  setTimeout(() => app.child.kill("SIGKILL"), 5000);
});

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`  ${ok ? "✓" : "✗"} ${name}${detail ? "  — " + detail : ""}`);
  if (!ok) failures++;
};

// better-auth's default id: 32 characters, letters and digits, no hyphens.
const legacyId = () => {
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from(crypto.randomBytes(32), (b) => alphabet[b % alphabet.length]).join("");
};

const post = (path, body, cookie) => fetch(BASE + path, {
  method: "POST",
  headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
  body: JSON.stringify(body),
  redirect: "manual",
});
const sessionCookie = (res) => (res.headers.getSetCookie?.() ?? [])
  .map((c) => c.split(";")[0]).filter((c) => c.startsWith("session_token=")).pop();

await sweep();
const app = await startApp();
try {
  const c = await db();

  // An admin to act as, made the ordinary way so its password really works.
  await post("/api/auth/sign-up", { name: "Admin", email: "admin@example.test", password: "correct horse battery" });
  await c.execute("UPDATE `user` SET `role` = 'admin', `emailVerified` = 1 WHERE `email` = 'admin@example.test'");
  const signIn = await post("/api/auth/sign-in", { email: "admin@example.test", password: "correct horse battery" });
  const cookie = sessionCookie(signIn);
  check("signed in as an admin", Boolean(cookie), `status ${signIn.status}`);

  // The account this is all about: an id from before better-auth was replaced.
  const legacy = legacyId();
  await c.execute(
    "INSERT INTO `user` (`id`, `name`, `email`, `emailVerified`, `role`) VALUES (?, ?, ?, 1, 'user')",
    [legacy, "Legacy Person", "legacy@example.test"],
  );

  console.log("\n1. an account older than v0.10.0 can be impersonated");
  const imp = await post("/api/auth/admin/impersonate", { userId: legacy }, cookie);
  const impBody = await imp.json();
  check("impersonation starts", imp.status === 200 && impBody.success === true,
    `status ${imp.status} ${JSON.stringify(impBody)}`);
  const impCookie = sessionCookie(imp);
  check("the new session is the legacy account's", Boolean(impCookie));
  if (impCookie) {
    const who = await (await fetch(BASE + "/api/auth/get-session", { headers: { cookie: impCookie } })).json();
    check("and it is flagged as an impersonation",
      who?.data?.user?.email === "legacy@example.test" && Boolean(who?.data?.session?.impersonatedBy),
      who?.data?.user?.email);
  }

  console.log("\n2. the same account can be edited and deleted");
  const upd = await post("/api/auth/admin/update", { userId: legacy, name: "Legacy Renamed" }, cookie);
  check("update accepted", upd.status === 200, `status ${upd.status} ${JSON.stringify(await upd.json())}`);
  const [rows] = await c.execute("SELECT name FROM `user` WHERE id = ?", [legacy]);
  check("the name really changed", rows[0]?.name === "Legacy Renamed", rows[0]?.name);

  console.log("\n3. a looser check is still a check");
  for (const [name, id, expected] of [
    ["an empty id", "", 400],
    ["a path traversal", "../../etc/passwd", 400],
    ["a quote", "abc'def", 400],
    ["something longer than the column", "a".repeat(37), 400],
    ["a well-formed id that is nobody", legacyId(), 404],
  ]) {
    const res = await post("/api/auth/admin/impersonate", { userId: id }, cookie);
    check(name + " is refused", res.status === expected, `status ${res.status}, expected ${expected}`);
  }

  console.log("\n4. deletion, which is the other endpoint that had the gate");
  const del = await post("/api/auth/admin/delete", { userId: legacy, reason: "test cleanup" }, cookie);
  check("delete accepted", del.status === 200, `status ${del.status} ${JSON.stringify(await del.json())}`);
  const [left] = await c.execute("SELECT id FROM `user` WHERE id = ?", [legacy]);
  check("the account is gone", left.length === 0);

  await c.end();
} finally {
  await stopApp(app);
  await sweep();
}

console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
