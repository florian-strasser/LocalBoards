// End-to-end check of the SAML service-provider side, against a provider that
// signs real assertions — and, for most of the cases, signs them wrongly on
// purpose. An implementation whose job is refusing bad assertions has to be
// tested with bad assertions.
import { chromium } from "playwright";
import mysql from "mysql2/promise";
import { spawn } from "node:child_process";
import fs from "node:fs";
import crypto from "node:crypto";
import { makeKeyPair, startFakeIdp } from "./fake-idp.mjs";

const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split("\n")
  .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
  .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")]));
const db = () => mysql.createConnection({ host: env.NUXT_MYSQL_HOST, user: env.NUXT_MYSQL_USER, password: env.NUXT_MYSQL_PASSWORD, database: env.NUXT_MYSQL_DATABASE });
const sweep = async () => { const c = await db();
  for (const t of ["session", "account"]) await c.execute(`DELETE FROM \`${t}\` WHERE userId IN (SELECT id FROM \`user\` WHERE email LIKE '%@example.test')`);
  await c.execute("DELETE FROM `user` WHERE email LIKE '%@example.test'"); await c.end(); };

const PORT = Number(process.env.SAML_TEST_PORT || 3108);
const BASE = `http://127.0.0.1:${PORT}`;
const ENTITY = `${BASE}/saml`;

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`  ${ok ? "✓" : "✗"} ${name}${detail ? "  — " + detail : ""}`);
  if (!ok) failures++;
};
const userRow = async (email) => {
  const c = await db();
  const [rows] = await c.execute(
    "SELECT u.id, u.name, u.email, u.role, (SELECT COUNT(*) FROM `account` a WHERE a.userId = u.id AND a.providerId = 'saml') AS samlLinks FROM `user` u WHERE LOWER(u.email) = ?",
    [email.toLowerCase()]);
  await c.end(); return rows[0] || null;
};

async function startApp(extra) {
  const child = spawn("node", [".output/server/index.mjs"], {
    env: { ...process.env, ...env, PORT: String(PORT), NUXT_BOARDS_URL: BASE, NUXT_MYSQL_SSL: "false", ...extra },
    stdio: ["ignore", "pipe", "pipe"] });
  const logs = []; child.stdout.on("data", (d) => logs.push(String(d))); child.stderr.on("data", (d) => logs.push(String(d)));
  for (let i = 0; i < 120; i++) {
    if (child.exitCode !== null) throw new Error("app exited:\n" + logs.join(""));
    try { if ((await fetch(BASE + "/")).ok) return { child, logs }; } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("app did not start:\n" + logs.join(""));
}
const stopApp = (app) => new Promise((resolve) => {
  if (app.child.exitCode !== null) return resolve();
  app.child.once("exit", resolve); app.child.kill("SIGTERM");
  setTimeout(() => app.child.kill("SIGKILL"), 5000);
});

const keys = makeKeyPair();
const otherKeys = makeKeyPair();          // a key the instance does not trust
const browser = await chromium.launch();

// Walks the whole browser journey: sign-in page → provider → back to the ACS.
// The whole journey, the way a person makes it: the sign-in page, the button,
// the provider, and back to the assertion consumer service.
const signIn = async (page) => {
  const trail = [];
  const record = (f) => { if (f === page.mainFrame()) trail.push(f.url()); };
  page.on("framenavigated", record);
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  const button = page.locator('a[href^="/api/auth/saml/start"]');
  if (!(await button.count())) { page.off("framenavigated", record); return { button: false, trail }; }
  await button.click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(600);
  page.off("framenavigated", record);
  return { button: true, url: page.url(), trail, refusal: trail.find((u) => u.includes("sso_error=")) };
};

// `idp` is passed so the instance's entry point is the fake provider, which is
// what makes the button send a real AuthnRequest to it.
const withInstance = async (extra, fn, idp = null) => {
  const app = await startApp({
    NUXT_SAML_ENABLED: "true",
    NUXT_SAML_ENTRY_POINT: idp
      ? `${idp.base}/sso?acs=${encodeURIComponent(BASE + "/api/auth/saml/acs")}&audience=${encodeURIComponent(ENTITY)}`
      : "https://unused.test/sso",
    NUXT_SAML_IDP_CERT: keys.certificate,
    NUXT_SAML_ENTITY_ID: ENTITY,
    NUXT_SAML_LABEL: "Sign in with the university",
    ...extra });
  try { return await fn(); } finally { await stopApp(app); }
};

// ---------------------------------------------------------------- case 1
console.log("\n1. a signed assertion signs somebody in, and makes the account");
await sweep();
{
  const idp = await startFakeIdp({ privateKey: keys.privateKey });
  await withInstance({ NUXT_SAML_IDP_ISSUER: idp.issuer }, async () => {
    const page = await browser.newPage();
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    check("the button is offered, with the configured label",
      (await page.locator('a[href^="/api/auth/saml/start"]').innerText()).includes("university"));
    const result = await signIn(page);
    check("lands on the dashboard", result.url?.includes("/dashboard"), result.refusal || result.url);
    const user = await userRow("alex@example.test");
    check("the account was created from the assertion", !!user, JSON.stringify(user));
    check("linked as a SAML identity", user?.samlLinks === 1);
    check("the session cookie is set", (await page.context().cookies()).some((c) => c.name === "session_token"));
    await page.close();
  }, idp);
  await idp.stop();
}

// ---------------------------------------------------------------- case 2
console.log("\n2. the AuthnRequest goes to the configured provider");
{
  await withInstance({ NUXT_SAML_ENTRY_POINT: "https://idp.example.test/sso/redirect" }, async () => {
    const res = await fetch(`${BASE}/api/auth/saml/start`, { redirect: "manual" });
    const location = res.headers.get("location") || "";
    check("redirects to the provider", location.startsWith("https://idp.example.test/sso/redirect"), location.slice(0, 60));
    check("carrying a SAMLRequest", location.includes("SAMLRequest="));
    check("and the RelayState", location.includes("RelayState="));
  });
}

// ---------------------------------------------------------------- case 3
console.log("\n3. the metadata document describes this instance");
{
  await withInstance({}, async () => {
    const res = await fetch(`${BASE}/api/auth/saml/metadata`);
    const xml = await res.text();
    check("served as XML", (res.headers.get("content-type") || "").includes("xml"), res.headers.get("content-type") || "");
    check("carries our entity id", xml.includes(ENTITY), ENTITY);
    check("and the assertion consumer service", xml.includes("/api/auth/saml/acs"));
  });
}

// ---------------------------------------------------------------- case 4
console.log("\n4. an assertion signed with the wrong key is refused");
await sweep();
{
  const idp = await startFakeIdp({ privateKey: otherKeys.privateKey });
  await withInstance({}, async () => {
    const page = await browser.newPage();
    const result = await signIn(page);
    check("refused", Boolean(result.refusal), result.refusal || result.url);
    check("no account created", (await userRow("alex@example.test")) === null);
    check("no session cookie", !(await page.context().cookies()).some((c) => c.name === "session_token"));
    await page.close();
  }, idp);
  await idp.stop();
}

// ---------------------------------------------------------------- case 5
console.log("\n5. an assertion altered after signing is refused");
await sweep();
{
  const idp = await startFakeIdp({ privateKey: keys.privateKey, mutate: { sign: { corruptAfterSigning: true } } });
  await withInstance({}, async () => {
    const page = await browser.newPage();
    const result = await signIn(page);
    check("refused", Boolean(result.refusal), result.refusal || result.url);
    check("the substituted address got no account", (await userRow("attacker@example.test")) === null);
    await page.close();
  }, idp);
  await idp.stop();
}

// ---------------------------------------------------------------- case 6
console.log("\n6. an assertion for a different audience is refused");
await sweep();
{
  const idp = await startFakeIdp({ privateKey: keys.privateKey });
  await withInstance({ NUXT_SAML_ENTITY_ID: `${BASE}/saml` }, async () => {
    const page = await browser.newPage();
    // The provider is told to address the assertion to somebody else.
    const trail = [];
    page.on("framenavigated", (f) => { if (f === page.mainFrame()) trail.push(f.url()); });
    await page.goto(`${idp.base}/sso?acs=${encodeURIComponent(BASE + "/api/auth/saml/acs")}&audience=${encodeURIComponent("https://someone-else.test/saml")}&RelayState=/dashboard/`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    check("refused", Boolean(trail.find((u) => u.includes("sso_error="))), trail.join(" → ").slice(0, 120));
    check("no account created", (await userRow("alex@example.test")) === null);
    await page.close();
  }, idp);
  await idp.stop();
}

// ---------------------------------------------------------------- case 7
console.log("\n7. an expired assertion is refused");
await sweep();
{
  const idp = await startFakeIdp({ privateKey: keys.privateKey, mutate: { build: { notBefore: -7200, notOnOrAfter: -3600 } } });
  await withInstance({}, async () => {
    const page = await browser.newPage();
    const result = await signIn(page);
    check("refused", Boolean(result.refusal), result.refusal || result.url);
    check("no account created", (await userRow("alex@example.test")) === null);
    await page.close();
  }, idp);
  await idp.stop();
}

// ---------------------------------------------------------------- case 8
console.log("\n8. a response from an unexpected issuer is refused");
await sweep();
{
  const idp = await startFakeIdp({ privateKey: keys.privateKey, issuer: "https://not-the-configured-idp.test/metadata" });
  await withInstance({ NUXT_SAML_IDP_ISSUER: "https://fake-idp.test/metadata" }, async () => {
    const page = await browser.newPage();
    const result = await signIn(page);
    check("refused", Boolean(result.refusal), result.refusal || result.url);
    check("no account created", (await userRow("alex@example.test")) === null);
    await page.close();
  }, idp);
  await idp.stop();
}

// ---------------------------------------------------------------- case 9
console.log("\n9. attributes: name, and an administrator group");
await sweep();
{
  const idp = await startFakeIdp({ privateKey: keys.privateKey, mutate: { build: {
    nameId: "dean@example.test",
    attributes: { displayName: "The Dean", memberOf: ["staff", "lokalboards-admins"] } } } });
  await withInstance({ NUXT_SAML_ADMIN_ATTRIBUTE: "memberOf", NUXT_SAML_ADMIN_VALUE: "lokalboards-admins" }, async () => {
    const page = await browser.newPage();
    const result = await signIn(page);
    const user = await userRow("dean@example.test");
    check("signed in", result.url?.includes("/dashboard"), result.refusal || result.url);
    check("the name came from the attribute", user?.name === "The Dean", JSON.stringify(user));
    check("the group made them an administrator", user?.role === "admin");
    await page.close();
  }, idp);
  await idp.stop();
}

// --------------------------------------------------------------- case 10
console.log("\n10. an existing account is linked, not duplicated");
await sweep();
{
  const c = await db();
  const id = crypto.randomUUID();
  await c.execute("INSERT INTO `user` (`id`, `name`, `email`, `emailVerified`, `role`, `onboarded`) VALUES (?, 'Long Standing', 'alex@example.test', 1, 'user', 1)", [id]);
  await c.execute("INSERT INTO `account` (`id`, `accountId`, `providerId`, `userId`, `password`) VALUES (?, 'alex@example.test', 'local', ?, 'x')", [crypto.randomUUID(), id]);
  await c.end();
  const idp = await startFakeIdp({ privateKey: keys.privateKey });
  await withInstance({}, async () => {
    const page = await browser.newPage();
    const result = await signIn(page);
    const user = await userRow("alex@example.test");
    check("signed in as the existing account", user?.id === id && result.url?.includes("/dashboard"), `${user?.id} at ${result.url}`);
    check("now linked by SAML too", user?.samlLinks === 1);
    check("reaches the dashboard", result.url?.includes("/dashboard"), result.refusal || result.url);
    await page.close();
  }, idp);
  await idp.stop();
}

// --------------------------------------------------------------- case 11
console.log("\n11. policy: no new accounts, and a domain restriction");
await sweep();
{
  const idp = await startFakeIdp({ privateKey: keys.privateKey, mutate: { build: { nameId: "outsider@example.test" } } });
  await withInstance({ NUXT_SAML_PROVISION: "existing" }, async () => {
    const page = await browser.newPage();
    const result = await signIn(page);
    check("an unknown person is turned away", Boolean(result.refusal?.includes("no_account")), result.refusal || result.url);
    await page.close();
  }, idp);
  await idp.stop();

  const idp2 = await startFakeIdp({ privateKey: keys.privateKey, mutate: { build: { nameId: "someone@other.test" } } });
  await withInstance({ NUXT_SAML_ALLOWED_DOMAINS: "example.test" }, async () => {
    const page = await browser.newPage();
    const result = await signIn(page);
    check("a foreign domain is refused", Boolean(result.refusal?.includes("domain_not_allowed")), result.refusal || result.url);
    await page.close();
  }, idp2);
  await idp2.stop();
}

// --------------------------------------------------------------- case 12
console.log("\n12. RelayState is not an open redirect");
await sweep();
{
  // The only way a hostile RelayState reaches us is on a response we did not
  // ask for, since our own request sets it — so this is tested there, with
  // provider-initiated sign-in switched on.
  const idp = await startFakeIdp({ privateKey: keys.privateKey });
  await withInstance({ NUXT_SAML_ALLOW_IDP_INITIATED: "true" }, async () => {
    const html = await (await fetch(`${idp.base}/sso?acs=${encodeURIComponent(BASE + "/api/auth/saml/acs")}&audience=${encodeURIComponent(ENTITY)}`)).text();
    const assertion = html.match(/name="SAMLResponse" value="([^"]+)"/)[1];
    const res = await fetch(`${BASE}/api/auth/saml/acs`, { method: "POST", redirect: "manual",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ SAMLResponse: assertion, RelayState: "https://evil.test/steal" }).toString() });
    const location = res.headers.get("location") || "";
    check("signed in", res.status === 302, `status ${res.status}`);
    check("sent to the dashboard, not to the other site", location === "/dashboard/", location);
  });
  await idp.stop();
}

// --------------------------------------------------------------- case 13
console.log("\n13. an encrypted assertion is decrypted and accepted");
await sweep();
{
  // A second key pair: the provider encrypts for our certificate, we decrypt
  // with our private key. The assertion is signed first, then encrypted, which
  // is the order a real provider uses.
  const spKeys = makeKeyPair();
  const idp = await startFakeIdp({ privateKey: keys.privateKey, mutate: { encryptFor: spKeys.certificate } });
  await withInstance({
    NUXT_SAML_DECRYPTION_KEY: spKeys.privateKey,
    NUXT_SAML_DECRYPTION_CERT: spKeys.certificate,
  }, async () => {
    const page = await browser.newPage();
    const result = await signIn(page);
    check("signed in from an encrypted assertion", result.url?.includes("/dashboard"), result.refusal || result.url);
    check("the account was created", !!(await userRow("alex@example.test")));
    // And the certificate is published, so a provider knows what to encrypt for.
    const xml = await (await fetch(`${BASE}/api/auth/saml/metadata`)).text();
    check("the metadata offers an encryption certificate", xml.includes("KeyDescriptor") && xml.includes("encryption"), xml.slice(0, 0));
    await page.close();
  }, idp);
  await idp.stop(); spKeys.cleanup();
}

// --------------------------------------------------------------- case 14
console.log("\n14. provider-initiated sign-in: off by default, on when asked, once only");
await sweep();
{
  // No InResponseTo: an assertion nobody here asked for.
  const idp = await startFakeIdp({ privateKey: keys.privateKey });
  const post = async (samlResponse) =>
    fetch(`${BASE}/api/auth/saml/acs`, { method: "POST", redirect: "manual",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ SAMLResponse: samlResponse, RelayState: "/dashboard/" }).toString() });
  const grab = async () => {
    const html = await (await fetch(`${idp.base}/sso?acs=${encodeURIComponent(BASE + "/api/auth/saml/acs")}&audience=${encodeURIComponent(ENTITY)}&RelayState=/dashboard/`)).text();
    return html.match(/name="SAMLResponse" value="([^"]+)"/)[1];
  };

  await withInstance({}, async () => {
    const res = await post(await grab());
    check("refused while it is off", (res.headers.get("location") || "").includes("idp_initiated_disabled"),
      res.headers.get("location") || String(res.status));
    check("no account created", (await userRow("alex@example.test")) === null);
  });

  await withInstance({ NUXT_SAML_ALLOW_IDP_INITIATED: "true" }, async () => {
    const assertion = await grab();
    const first = await post(assertion);
    check("accepted when switched on", (first.headers.get("location") || "") === "/dashboard/",
      first.headers.get("location") || String(first.status));
    check("the account was created", !!(await userRow("alex@example.test")));
    // The same assertion again: a bearer token replayed.
    const second = await post(assertion);
    check("the same assertion cannot be used twice",
      (second.headers.get("location") || "").includes("assertion_replayed"),
      second.headers.get("location") || String(second.status));
  });
  await idp.stop();
}

// --------------------------------------------------------------- case 15
console.log("\n15. with SAML switched off there is nothing to click, and no way in");
{
  const app = await startApp({ NUXT_SAML_ENABLED: "false" });
  const page = await browser.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  check("no button", (await page.locator('a[href^="/api/auth/saml/start"]').count()) === 0);
  for (const path of ["/api/auth/saml/start", "/api/auth/saml/metadata"]) {
    const res = await fetch(BASE + path, { redirect: "manual" });
    check(`${path} answers 404`, res.status === 404, `status ${res.status}`);
  }
  const res = await fetch(`${BASE}/api/auth/saml/acs`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
  check("the ACS answers 404", res.status === 404, `status ${res.status}`);
  await page.close(); await stopApp(app);
}

await browser.close();
await sweep();
keys.cleanup(); otherKeys.cleanup();
console.log(failures ? `\n${failures} check(s) FAILED` : "\nall checks passed");
process.exit(failures ? 1 : 0);
