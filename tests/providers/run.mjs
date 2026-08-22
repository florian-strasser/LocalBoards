// Several identity providers on one instance, and sending somebody to the right
// one from the address they type.
//
// Two OpenID Connect providers and one SAML, all live at once: a button each,
// each signing in against its own issuer, and an address routed to whichever
// provider claims its domain.
import { chromium } from "playwright";
import mysql from "mysql2/promise";
import { spawn } from "node:child_process";
import fs from "node:fs";
import { startFakeIdp as startOidc } from "../sso/fake-idp.mjs";
import { makeKeyPair, startFakeIdp as startSaml } from "../saml/fake-idp.mjs";

const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split("\n")
  .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
  .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")]));
const db = () => mysql.createConnection({ host: env.NUXT_MYSQL_HOST, user: env.NUXT_MYSQL_USER, password: env.NUXT_MYSQL_PASSWORD, database: env.NUXT_MYSQL_DATABASE });
const sweep = async () => { const c = await db();
  for (const t of ["session", "account"]) await c.execute(`DELETE FROM \`${t}\` WHERE userId IN (SELECT id FROM \`user\` WHERE email LIKE '%@example.test' OR email LIKE '%@partner.test')`);
  await c.execute("DELETE FROM `user` WHERE email LIKE '%@example.test' OR email LIKE '%@partner.test'"); await c.end(); };

const PORT = Number(process.env.PROVIDERS_TEST_PORT || 3112);
const BASE = `http://127.0.0.1:${PORT}`;
let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`  ${ok ? "✓" : "✗"} ${name}${detail ? "  — " + detail : ""}`);
  if (!ok) failures++;
};
const userRow = async (email) => { const c = await db();
  const [rows] = await c.execute("SELECT u.id, u.email, (SELECT GROUP_CONCAT(a.providerId) FROM `account` a WHERE a.userId = u.id) AS providers FROM `user` u WHERE LOWER(u.email) = ?", [email.toLowerCase()]);
  await c.end(); return rows[0] || null; };

await sweep();
const keys = makeKeyPair();
const acme = await startOidc({ clientId: "acme-client", clientSecret: "acme-secret",
  user: { sub: "acme-1", email: "person@acme.test", name: "Acme Person" } });
const partner = await startOidc({ clientId: "partner-client", clientSecret: "partner-secret",
  user: { sub: "partner-1", email: "person@partner.test", name: "Partner Person" } });
const university = await startSaml({ privateKey: keys.privateKey });

const child = spawn("node", [".output/server/index.mjs"], { env: { ...process.env, ...env,
  PORT: String(PORT), NUXT_BOARDS_URL: BASE, NUXT_MYSQL_SSL: "false",
  // Two named OpenID Connect providers…
  NUXT_SSO_PROVIDERS: "acme,partner",
  NUXT_SSO_ACME_ISSUER: acme.issuer, NUXT_SSO_ACME_CLIENT_ID: "acme-client",
  NUXT_SSO_ACME_CLIENT_SECRET: "acme-secret", NUXT_SSO_ACME_LABEL: "Acme Corp",
  NUXT_SSO_ACME_DOMAINS: "acme.test",
  NUXT_SSO_PARTNER_ISSUER: partner.issuer, NUXT_SSO_PARTNER_CLIENT_ID: "partner-client",
  NUXT_SSO_PARTNER_CLIENT_SECRET: "partner-secret", NUXT_SSO_PARTNER_LABEL: "Partner Ltd",
  NUXT_SSO_PARTNER_DOMAINS: "partner.test",
  // …and one SAML provider beside them.
  NUXT_SAML_ENABLED: "true", NUXT_SAML_LABEL: "The University",
  NUXT_SAML_ENTRY_POINT: `${university.base}/sso?acs=${encodeURIComponent(BASE + "/api/auth/saml/acs")}&audience=${encodeURIComponent(BASE + "/saml")}`,
  NUXT_SAML_IDP_CERT: keys.certificate, NUXT_SAML_ENTITY_ID: `${BASE}/saml`,
  NUXT_SAML_DOMAINS: "example.test",
}, stdio: ["ignore", "pipe", "pipe"] });
const logs = []; child.stdout.on("data", (d) => logs.push(String(d))); child.stderr.on("data", (d) => logs.push(String(d)));
for (let i = 0; i < 120; i++) { try { if ((await fetch(BASE + "/")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 250)); }

console.log("\n1. every provider is offered, each with its own name");
{
  const config = await (await fetch(`${BASE}/api/auth/sso/config`)).json();
  const ids = config.providers.map((p) => `${p.id}:${p.kind}`).sort();
  check("three providers listed", ids.length === 3, ids.join(" "));
  check("named as configured", config.providers.map((p) => p.label).sort().join(", ") === "Acme Corp, Partner Ltd, The University",
    config.providers.map((p) => p.label).join(", "));
  check("routing is offered", config.routing === true);
  check("no secrets in the answer", !JSON.stringify(config).includes("secret") && !JSON.stringify(config).includes("issuer"),
    JSON.stringify(config).slice(0, 80));
}

console.log("\n2. an address is routed to the provider that claims its domain");
{
  for (const [email, expected] of [["someone@acme.test", "acme"], ["someone@partner.test", "partner"],
                                   ["someone@example.test", "saml"], ["someone@nobody.test", null]]) {
    const answer = await (await fetch(`${BASE}/api/auth/sso/route?email=${encodeURIComponent(email)}`)).json();
    check(`${email} → ${expected ?? "no provider"}`, (answer.provider?.id ?? null) === expected, answer.provider?.id ?? "none");
  }
}

console.log("\n3. the sign-in page offers the matching one as the visitor types");
{
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  check("all three buttons are there", (await page.locator('a[href*="/start?provider="]').count()) === 3,
    String(await page.locator('a[href*="/start?provider="]').count()));
  await page.fill('input[type="email"]', "someone@partner.test");
  await page.waitForTimeout(900);
  const highlighted = page.locator("a.bg-primary");
  check("the partner's button is brought forward", (await highlighted.count()) === 1 && (await highlighted.innerText()).includes("Partner"),
    (await highlighted.count()) ? await highlighted.innerText() : "none");
  await page.fill('input[type="email"]', "someone@nobody.test");
  await page.waitForTimeout(900);
  check("an unknown domain highlights nothing", (await page.locator("a.bg-primary").count()) === 0);
  await page.close(); await browser.close();
}

console.log("\n4. each provider signs in against its own issuer");
{
  const browser = await chromium.launch();
  for (const [id, email] of [["acme", "person@acme.test"], ["partner", "person@partner.test"]]) {
    const page = await browser.newPage();
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    await page.click(`a[href="/api/auth/sso/start?provider=${id}"]`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    check(`${id} signs in`, page.url().includes("/dashboard"), page.url());
    const user = await userRow(email);
    check(`${id} made the right account`, !!user && String(user.providers).includes("sso"), JSON.stringify(user));
    await page.close();
  }
  // And the SAML one, beside them.
  const page = await browser.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.click('a[href="/api/auth/saml/start?provider=saml"]');
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(700);
  check("the SAML provider signs in too", page.url().includes("/dashboard"), page.url());
  check("as a SAML identity", String((await userRow("alex@example.test"))?.providers).includes("saml"));
  await page.close(); await browser.close();
}

console.log("\n5. a provider nobody configured is not a way in");
{
  const res = await fetch(`${BASE}/api/auth/sso/start?provider=made-up`, { redirect: "manual" });
  check("unknown OpenID Connect provider answers 404", res.status === 404, `status ${res.status}`);
  const res2 = await fetch(`${BASE}/api/auth/saml/start?provider=made-up`, { redirect: "manual" });
  check("unknown SAML provider answers 404", res2.status === 404, `status ${res2.status}`);
}

await new Promise((r) => { child.once("exit", r); child.kill("SIGTERM"); });
await acme.stop(); await partner.stop(); await university.stop(); keys.cleanup();
await sweep();
console.log(failures ? `\n${failures} check(s) FAILED` : "\nall checks passed");
process.exit(failures ? 1 : 0);
