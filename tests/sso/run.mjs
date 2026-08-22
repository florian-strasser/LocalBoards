// End-to-end check of the single sign-on flow, against a provider that insists
// on PKCE, a nonce and client authentication (tests/sso/fake-idp.mjs).
//
// Each case starts the app with its own environment, because the whole point is
// how the instance is configured: what happens with automatic provisioning, with
// it turned off, with a domain restriction, when the ID token is sparse, when
// the provider says no, and when SSO is not configured at all.
import { chromium } from "playwright";
import mysql from "mysql2/promise";
import { spawn } from "node:child_process";
import fs from "node:fs";
import crypto from "node:crypto";
import { startFakeIdp } from "./fake-idp.mjs";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")]),
);
const db = () => mysql.createConnection({
  host: env.NUXT_MYSQL_HOST, user: env.NUXT_MYSQL_USER,
  password: env.NUXT_MYSQL_PASSWORD, database: env.NUXT_MYSQL_DATABASE,
});
const U = "COLLATE utf8mb4_general_ci IN (SELECT id COLLATE utf8mb4_general_ci FROM `user` WHERE email LIKE '%@example.test')";
const sweep = async () => {
  const c = await db();
  await c.execute(`DELETE FROM board_placements WHERE \`user\` ${U}`);
  for (const t of ["session", "account"]) {
    await c.execute(`DELETE FROM \`${t}\` WHERE userId IN (SELECT id FROM \`user\` WHERE email LIKE '%@example.test')`);
  }
  await c.execute("DELETE FROM `user` WHERE email LIKE '%@example.test'");
  await c.end();
};

// A port of its own, and never a port anything else in this project uses
// (3000 is the dev server, 3100/3101/3102 are the verification instances).
const PORT = Number(process.env.SSO_TEST_PORT || 3105);
const BASE = `http://127.0.0.1:${PORT}`;

async function startApp(extra) {
  const child = spawn("node", [".output/server/index.mjs"], {
    env: { ...process.env, ...env, PORT: String(PORT), NUXT_BOARDS_URL: BASE, NUXT_MYSQL_SSL: "false", ...extra },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const logs = [];
  child.stdout.on("data", (d) => logs.push(String(d)));
  child.stderr.on("data", (d) => logs.push(String(d)));
  for (let i = 0; i < 120; i++) {
    if (child.exitCode !== null) {
      throw new Error("app exited while starting:\n" + logs.join(""));
    }
    try {
      const res = await fetch(BASE + "/");
      if (res.ok) return { child, logs };
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("app did not start:\n" + logs.join(""));
}
// Waited for, not fired and forgotten: the next case binds the same port, and a
// server still shutting down means the next start fails with EADDRINUSE.
const stopApp = (app) =>
  new Promise((resolve) => {
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
const userRow = async (email) => {
  const c = await db();
  const [rows] = await c.execute(
    "SELECT u.id, u.name, u.email, u.role, (SELECT COUNT(*) FROM `account` a WHERE a.userId = u.id AND a.providerId = 'sso') AS ssoLinks FROM `user` u WHERE LOWER(u.email) = ?",
    [email.toLowerCase()],
  );
  await c.end();
  return rows[0] || null;
};

const browser = await chromium.launch();

// Every URL the browser passed through, because the sign-in page clears
// `?sso_error=` out of the address bar once it has shown the message — so the
// final URL never carries the reason, only the journey does.
const signIn = async (page) => {
  const trail = [];
  const record = (frame) => { if (frame === page.mainFrame()) trail.push(frame.url()); };
  page.on("framenavigated", record);
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  const button = page.locator('a[href^="/api/auth/sso/start"]');
  if (!(await button.count())) { page.off("framenavigated", record); return { clicked: false, trail }; }
  await button.click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(400); // let the page show its message and tidy the URL
  page.off("framenavigated", record);
  return { clicked: true, url: page.url(), trail, refusal: trail.find((u) => u.includes("sso_error=")) };
};

// The message the visitor is actually shown.
const toastText = async (page) => {
  // The toast is the one fixed panel in the bottom corner (ToastHolder.vue).
  const toast = page.locator("div.fixed.bottom-8.right-8").first();
  if (!(await toast.count())) return "";
  return (await toast.innerText().catch(() => "")).trim();
};

// ---------------------------------------------------------------- case 1
console.log("\n1. a first sign-in creates the account (provisioning: auto)");
await sweep();
{
  const idp = await startFakeIdp();
  const app = await startApp({
    NUXT_SSO_ENABLED: "true", NUXT_SSO_ISSUER: idp.issuer,
    NUXT_SSO_CLIENT_ID: "lokalboards-test", NUXT_SSO_CLIENT_SECRET: "test-secret",
    NUXT_SSO_LABEL: "Sign in with Example Corp",
  });
  const page = await browser.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  check("the button is offered, with the configured label",
    (await page.locator('a[href^="/api/auth/sso/start"]').innerText()).includes("Example Corp"));
  const result = await signIn(page);
  check("the browser lands on the dashboard", result.url?.includes("/dashboard"), result.url);
  const user = await userRow("alex@example.test");
  check("a user was created from the claims", !!user && user.name === "Alex Morgan", JSON.stringify(user));
  check("linked to the provider's subject", user?.ssoLinks === 1);
  check("the session cookie is set", (await page.context().cookies()).some((c) => c.name === "session_token"));
  // The provider saw a proper request.
  check("PKCE was used (S256)", idp.seen.authorize?.code_challenge_method === "S256");
  check("a nonce was sent", Boolean(idp.seen.authorize?.nonce));
  check("the code was exchanged with the client secret", idp.seen.token?.client_secret === "test-secret");
  check("the redirect URI is the instance's own", idp.seen.authorize?.redirect_uri === `${BASE}/api/auth/sso/callback`);
  await page.close(); await stopApp(app); await idp.stop();
}

// ---------------------------------------------------------------- case 2
console.log("\n2. signing in again reuses the same account");
{
  const idp = await startFakeIdp();
  const app = await startApp({
    NUXT_SSO_ENABLED: "true", NUXT_SSO_ISSUER: idp.issuer,
    NUXT_SSO_CLIENT_ID: "lokalboards-test", NUXT_SSO_CLIENT_SECRET: "test-secret",
  });
  const before = await userRow("alex@example.test");
  const page = await browser.newPage();
  const result = await signIn(page);
  const after = await userRow("alex@example.test");
  check("same user id, no second account", before?.id === after?.id && after?.ssoLinks === 1);
  check("still reaches the dashboard", result.url?.includes("/dashboard"));
  await page.close(); await stopApp(app); await idp.stop();
}

// ---------------------------------------------------------------- case 3
console.log("\n3. an existing local account is linked, not duplicated");
await sweep();
{
  const c = await db();
  const id = crypto.randomUUID();
  await c.execute(
    "INSERT INTO `user` (`id`, `name`, `email`, `emailVerified`, `role`, `onboarded`) VALUES (?, 'Existing Person', 'existing@example.test', 1, 'user', 1)",
    [id],
  );
  await c.execute("INSERT INTO `account` (`id`, `accountId`, `providerId`, `userId`, `password`) VALUES (?, 'existing@example.test', 'local', ?, 'x')",
    [crypto.randomUUID(), id]);
  await c.end();

  const idp = await startFakeIdp({ user: { sub: "u-existing", email: "existing@example.test", name: "Existing Person" } });
  const app = await startApp({
    NUXT_SSO_ENABLED: "true", NUXT_SSO_ISSUER: idp.issuer,
    NUXT_SSO_CLIENT_ID: "lokalboards-test", NUXT_SSO_CLIENT_SECRET: "test-secret",
  });
  const page = await browser.newPage();
  const result = await signIn(page);
  const user = await userRow("existing@example.test");
  check("signed in as the account that was already there", user?.id === id, user?.id);
  check("the provider is now linked to it", user?.ssoLinks === 1);
  check("reaches the dashboard", result.url?.includes("/dashboard"));
  const c2 = await db();
  const [[count]] = await c2.execute("SELECT COUNT(*) n FROM `user` WHERE email = 'existing@example.test'");
  await c2.end();
  check("no second user with that address", count.n === 1, `${count.n} rows`);
  await page.close(); await stopApp(app); await idp.stop();
}

// ---------------------------------------------------------------- case 4
console.log("\n4. provisioning: existing — an unknown person is turned away");
await sweep();
{
  const idp = await startFakeIdp({ user: { sub: "u-stranger", email: "stranger@example.test", name: "A Stranger" } });
  const app = await startApp({
    NUXT_SSO_ENABLED: "true", NUXT_SSO_ISSUER: idp.issuer,
    NUXT_SSO_CLIENT_ID: "lokalboards-test", NUXT_SSO_CLIENT_SECRET: "test-secret",
    NUXT_SSO_PROVISION: "existing",
  });
  const page = await browser.newPage();
  const result = await signIn(page);
  check("sent back to the sign-in page with a reason", Boolean(result.refusal?.includes("sso_error=no_account")), result.refusal || result.trail.join(" → "));
  const told = await toastText(page);
  check("and told why, in the instance's language", told.length > 10 && !told.startsWith("sso_"), told);
  check("no account was created", (await userRow("stranger@example.test")) === null);
  await page.close(); await stopApp(app); await idp.stop();
}

// ---------------------------------------------------------------- case 5
console.log("\n5. a domain restriction keeps other domains out");
await sweep();
{
  const idp = await startFakeIdp({ user: { sub: "u-outside", email: "someone@other.test", name: "Outside Person" } });
  const app = await startApp({
    NUXT_SSO_ENABLED: "true", NUXT_SSO_ISSUER: idp.issuer,
    NUXT_SSO_CLIENT_ID: "lokalboards-test", NUXT_SSO_CLIENT_SECRET: "test-secret",
    NUXT_SSO_ALLOWED_DOMAINS: "example.test, subsidiary.test",
  });
  const page = await browser.newPage();
  const result = await signIn(page);
  check("refused with a reason", Boolean(result.refusal?.includes("sso_error=domain_not_allowed")), result.refusal || result.trail.join(" → "));
  const toldDomain = await toastText(page);
  check("and told why, in the instance's language", toldDomain.length > 10 && !toldDomain.startsWith("sso_"), toldDomain);
  const c = await db();
  const [[count]] = await c.execute("SELECT COUNT(*) n FROM `user` WHERE email = 'someone@other.test'");
  await c.end();
  check("no account was created", count.n === 0);
  await page.close(); await stopApp(app); await idp.stop();
}

// ---------------------------------------------------------------- case 6
console.log("\n6. a sparse ID token is filled in from userinfo");
await sweep();
{
  const idp = await startFakeIdp({ sparseIdToken: true, user: { sub: "u-sparse", email: "sparse@example.test", name: "Sparse Claims" } });
  const app = await startApp({
    NUXT_SSO_ENABLED: "true", NUXT_SSO_ISSUER: idp.issuer,
    NUXT_SSO_CLIENT_ID: "lokalboards-test", NUXT_SSO_CLIENT_SECRET: "test-secret",
  });
  const page = await browser.newPage();
  const result = await signIn(page);
  const user = await userRow("sparse@example.test");
  check("the address came from userinfo", !!user, JSON.stringify(user));
  check("and the name with it", user?.name === "Sparse Claims");
  check("reaches the dashboard", result.url?.includes("/dashboard"));
  await page.close(); await stopApp(app); await idp.stop();
}

// ---------------------------------------------------------------- case 7
console.log("\n7. the admin claim decides the role, both ways");
await sweep();
{
  const idp = await startFakeIdp({
    user: { sub: "u-boss", email: "boss@example.test", name: "The Boss" },
    extraClaims: { groups: ["staff", "lokalboards-admins"] },
  });
  const app = await startApp({
    NUXT_SSO_ENABLED: "true", NUXT_SSO_ISSUER: idp.issuer,
    NUXT_SSO_CLIENT_ID: "lokalboards-test", NUXT_SSO_CLIENT_SECRET: "test-secret",
    NUXT_SSO_ADMIN_CLAIM: "groups", NUXT_SSO_ADMIN_VALUE: "lokalboards-admins",
  });
  const page = await browser.newPage();
  await signIn(page);
  check("in the admin group ⇒ admin here", (await userRow("boss@example.test"))?.role === "admin");
  await page.close(); await stopApp(app); await idp.stop();

  // Removed from the group at the provider: the next sign-in takes it away.
  const idp2 = await startFakeIdp({
    user: { sub: "u-boss", email: "boss@example.test", name: "The Boss" },
    extraClaims: { groups: ["staff"] },
  });
  const app2 = await startApp({
    NUXT_SSO_ENABLED: "true", NUXT_SSO_ISSUER: idp2.issuer,
    NUXT_SSO_CLIENT_ID: "lokalboards-test", NUXT_SSO_CLIENT_SECRET: "test-secret",
    NUXT_SSO_ADMIN_CLAIM: "groups", NUXT_SSO_ADMIN_VALUE: "lokalboards-admins",
  });
  const page2 = await browser.newPage();
  await signIn(page2);
  check("out of the group ⇒ no longer admin", (await userRow("boss@example.test"))?.role === "user");
  await page2.close(); await stopApp(app2); await idp2.stop();
}

// ---------------------------------------------------------------- case 8
console.log("\n8. a callback without this browser's state is refused");
await sweep();
{
  const idp = await startFakeIdp();
  const app = await startApp({
    NUXT_SSO_ENABLED: "true", NUXT_SSO_ISSUER: idp.issuer,
    NUXT_SSO_CLIENT_ID: "lokalboards-test", NUXT_SSO_CLIENT_SECRET: "test-secret",
  });
  // Read at the HTTP level: the redirect itself carries the reason, and no
  // browser is involved in tidying it away.
  const res = await fetch(`${BASE}/api/auth/sso/callback?code=stolen&state=guessed`, { redirect: "manual" });
  const location = res.headers.get("location") || "";
  check("redirected, not served", res.status === 302, `status ${res.status}`);
  check("refused with state_mismatch", location.includes("sso_error=state_mismatch"), location);
  check("no session cookie was set", !(res.headers.get("set-cookie") || "").includes("session_token"),
    res.headers.get("set-cookie") || "(none)");
  await stopApp(app); await idp.stop();
}

// ---------------------------------------------------------------- case 9
console.log("\n9. a plain OAuth 2.0 provider, with its own field names");
await sweep();
{
  // No discovery, no ID token, a form-encoded token response, and a profile
  // shaped like GitHub's: a numeric `id`, a `login`, no `sub` and no `name`.
  const idp = await startFakeIdp({
    oauth2Only: true,
    formEncodedTokens: true,
    profile: { id: 4711, login: "octocat", email: "octocat@example.test", avatar_url: "https://example.test/a.png" },
  });
  const app = await startApp({
    NUXT_SSO_ENABLED: "true", NUXT_SSO_ISSUER: idp.issuer,
    NUXT_SSO_AUTHORIZATION_URL: `${idp.issuer}/authorize`,
    NUXT_SSO_TOKEN_URL: `${idp.issuer}/token`,
    NUXT_SSO_USERINFO_URL: `${idp.issuer}/userinfo`,
    NUXT_SSO_CLIENT_ID: "lokalboards-test", NUXT_SSO_CLIENT_SECRET: "test-secret",
    NUXT_SSO_CLAIM_SUBJECT: "id", NUXT_SSO_CLAIM_EMAIL: "email", NUXT_SSO_CLAIM_NAME: "login",
  });
  const page = await browser.newPage();
  const result = await signIn(page);
  const user = await userRow("octocat@example.test");
  check("signs in with the mapping", result.url?.includes("/dashboard"), result.refusal || result.url);
  check("the name came from the mapped field", user?.name === "octocat", JSON.stringify(user));
  check("linked by the mapped subject", user?.ssoLinks === 1);
  await page.close(); await stopApp(app); await idp.stop();
}

// -------------------------------------------------------------- case 9b
console.log("\n9b. the same provider without a mapping is refused, not guessed at");
await sweep();
{
  const idp = await startFakeIdp({
    oauth2Only: true,
    profile: { id: 4712, login: "nomap", email: "nomap@example.test" },
  });
  const app = await startApp({
    NUXT_SSO_ENABLED: "true", NUXT_SSO_ISSUER: idp.issuer,
    NUXT_SSO_AUTHORIZATION_URL: `${idp.issuer}/authorize`,
    NUXT_SSO_TOKEN_URL: `${idp.issuer}/token`,
    NUXT_SSO_USERINFO_URL: `${idp.issuer}/userinfo`,
    NUXT_SSO_CLIENT_ID: "lokalboards-test", NUXT_SSO_CLIENT_SECRET: "test-secret",
  });
  const page = await browser.newPage();
  const result = await signIn(page);
  check("refused for want of a subject", Boolean(result.refusal?.includes("sso_error=no_email")), result.refusal || result.url);
  check("no account was created", (await userRow("nomap@example.test")) === null);
  await page.close(); await stopApp(app); await idp.stop();
}

// -------------------------------------------------------------- case 9c
console.log("\n9c. several candidate fields, and nested ones");
await sweep();
{
  const idp = await startFakeIdp({
    oauth2Only: true,
    // The first choice for the address is empty, and the name is two levels in.
    profile: { id: 99, email: "", primary_email: "nested@example.test", data: { attributes: { display: "Nested Person" } } },
  });
  const app = await startApp({
    NUXT_SSO_ENABLED: "true", NUXT_SSO_ISSUER: idp.issuer,
    NUXT_SSO_AUTHORIZATION_URL: `${idp.issuer}/authorize`,
    NUXT_SSO_TOKEN_URL: `${idp.issuer}/token`,
    NUXT_SSO_USERINFO_URL: `${idp.issuer}/userinfo`,
    NUXT_SSO_CLIENT_ID: "lokalboards-test", NUXT_SSO_CLIENT_SECRET: "test-secret",
    NUXT_SSO_CLAIM_SUBJECT: "id",
    NUXT_SSO_CLAIM_EMAIL: "email,primary_email",
    NUXT_SSO_CLAIM_NAME: "data.attributes.display",
  });
  const page = await browser.newPage();
  const result = await signIn(page);
  const user = await userRow("nested@example.test");
  check("fell through to the second candidate", !!user, result.refusal || JSON.stringify(user));
  check("read the nested name", user?.name === "Nested Person", user?.name);
  await page.close(); await stopApp(app); await idp.stop();
}

// ---------------------------------------------------------------- case 10
console.log("\n10. with SSO switched off there is nothing to click, and no way in");
{
  const app = await startApp({ NUXT_SSO_ENABLED: "false" });
  const page = await browser.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  check("no button on the sign-in page", (await page.locator('a[href^="/api/auth/sso/start"]').count()) === 0);
  const res = await fetch(`${BASE}/api/auth/sso/start`, { redirect: "manual" });
  check("the start endpoint answers 404", res.status === 404, `status ${res.status}`);
  const res2 = await fetch(`${BASE}/api/auth/sso/callback?code=x&state=y`, { redirect: "manual" });
  check("the callback answers 404", res2.status === 404, `status ${res2.status}`);
  await page.close(); await stopApp(app);
}

await browser.close();
await sweep();
const c = await db();
const [[left]] = await c.execute("SELECT COUNT(*) n FROM `user` WHERE email LIKE '%@example.test'");
await c.end();
console.log(`\ncleanup: ${left.n} test users left behind`);
console.log(failures ? `\n${failures} check(s) FAILED` : "\nall checks passed");
process.exit(failures ? 1 : 0);
