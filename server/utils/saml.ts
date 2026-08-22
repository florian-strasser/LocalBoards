import { SAML } from "@node-saml/node-saml";
import { setupDatabase } from "../../app/lib/databaseSetup";
import type { SsoConfig, SsoProfile } from "./sso";
import { pickClaim } from "./sso";

// SAML 2.0, for the organisations whose identity provider speaks that and not
// OpenID Connect — which in practice means a good deal of higher education,
// public administration and anything bought before about 2015.
//
// The signature checking is `@node-saml/node-saml`, deliberately. Everything
// dangerous about SAML lives in the XML: canonicalisation, which element a
// signature actually covers, and the signature-wrapping family of attacks that
// have produced authentication bypasses in library after library for fifteen
// years. That is not a thing to hand-roll for the sake of one fewer dependency.
// What is written here is the part that is ours: configuration, the profile,
// and the policy about who is allowed in.

export type SamlConfig = SsoConfig & {
  entryPoint: string;
  // The provider's signing certificate, PEM or bare base64. Several may be
  // given, separated by commas, which is how a certificate rollover is survived:
  // both are accepted while the provider swaps one for the other.
  idpCert: string[];
  idpIssuer: string;
  entityId: string;
  identifierFormat: string;
  signatureAlgorithm: string;
  clockSkewSeconds: number;
  disableRequestedAuthnContext: boolean;
  wantResponseSigned: boolean;
  // The private key assertions encrypted for us are decrypted with, and the
  // certificate that goes in our metadata for the provider to encrypt with.
  decryptionKey: string;
  decryptionCert: string;
  // Whether to accept an assertion nobody here asked for — somebody starting at
  // their provider's portal rather than at our sign-in page.
  allowIdpInitiated: boolean;
};

// A certificate as node-saml wants it: base64 with no PEM armour and no
// whitespace. Administrators paste all three forms, so all three are accepted.
function normaliseCert(value: string): string {
  return value
    .replace(/-----BEGIN CERTIFICATE-----/g, "")
    .replace(/-----END CERTIFICATE-----/g, "")
    .replace(/\s+/g, "");
}

// A key pasted into an environment variable arrives in every shape: with the
// PEM armour, without it, with real newlines, or with the `\n` escapes that
// survive a Docker environment file. All four have to work, because getting
// this wrong produces a decryption failure with nothing to suggest why.
function pem(value: string, label: string): string {
  const text = value.replace(/\\n/g, "\n").trim();
  if (!text) return "";
  if (text.includes("-----BEGIN")) return text;
  const body = text.replace(/\s+/g, "").match(/.{1,64}/g)?.join("\n") ?? "";
  return `-----BEGIN ${label}-----\n${body}\n-----END ${label}-----`;
}

export function readSamlConfig(event?: any): SamlConfig {
  return samlConfigFrom(useRuntimeConfig(event) as any);
}

// From a plain object, for the provider registry — see `ssoProviders.ts`.
export function samlConfigFrom(config: any): SamlConfig {
  const truthy = (value: any) =>
    value === true || String(value).toLowerCase() === "true";
  const base = String(config.boardsUrl || "").replace(/\/+$/, "");

  return {
    // The policy half is shared with OpenID Connect: who may sign in, whether
    // accounts are created, which claim makes an administrator.
    enabled: truthy(config.samlEnabled),
    label: String(config.samlLabel || "SAML single sign-on"),
    provision:
      String(config.samlProvision || config.ssoProvision || "auto").toLowerCase() ===
      "existing"
        ? "existing"
        : "auto",
    allowedDomains: String(
      config.samlAllowedDomains || config.ssoAllowedDomains || "",
    )
      .split(",")
      .map((domain: string) => domain.trim().toLowerCase())
      .filter(Boolean),
    adminClaim: String(config.samlAdminAttribute || ""),
    adminValue: String(config.samlAdminValue || ""),
    // SAML attribute names are usually URNs rather than words, so the mapping
    // matters more here than it does for OpenID Connect.
    claimSubject: String(config.samlAttributeSubject || ""),
    claimEmail: String(config.samlAttributeEmail || ""),
    claimName: String(config.samlAttributeName || ""),

    // The parts that are SAML's own.
    entryPoint: String(config.samlEntryPoint || ""),
    idpCert: String(config.samlIdpCert || "")
      .split(",")
      .map((cert: string) => normaliseCert(cert))
      .filter(Boolean),
    idpIssuer: String(config.samlIdpIssuer || ""),
    // Our own name in the exchange. Defaults to the instance's URL, which is
    // what most providers expect to be given as the entity id.
    entityId: String(config.samlEntityId || base || "lokalboards"),
    identifierFormat: String(
      config.samlIdentifierFormat ||
        "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
    ),
    signatureAlgorithm: String(config.samlSignatureAlgorithm || "sha256"),
    clockSkewSeconds: Number(config.samlClockSkewSeconds || 60),
    disableRequestedAuthnContext: truthy(
      config.samlDisableRequestedAuthnContext,
    ),
    wantResponseSigned: truthy(config.samlWantResponseSigned),
    decryptionKey: pem(String(config.samlDecryptionKey || ""), "PRIVATE KEY"),
    decryptionCert: normaliseCert(String(config.samlDecryptionCert || "")),
    allowIdpInitiated: truthy(config.samlAllowIdpInitiated),

    // Unused here, but the shared type carries them.
    issuer: "",
    clientId: "",
    clientSecret: "",
    scopes: "",
    authorizationUrl: "",
    tokenUrl: "",
    userinfoUrl: "",
  };
}

// Enabled, and enough of it filled in to work. Anything less behaves as off.
export function samlIsUsable(config: SamlConfig): boolean {
  return Boolean(
    config.enabled && config.entryPoint && config.idpCert.length && config.entityId,
  );
}

// Where the provider posts its answer. With several providers configured, each
// gets its own — the name in the query string is how the response is matched
// back to the provider whose certificate should verify it.
export function samlCallbackUrl(event?: any, providerId?: string): string {
  const base = String(useRuntimeConfig(event).boardsUrl || "").replace(
    /\/+$/,
    "",
  );
  const url = `${base}/api/auth/saml/acs`;
  return providerId && providerId !== "saml"
    ? `${url}?provider=${encodeURIComponent(providerId)}`
    : url;
}

export function buildSaml(
  config: SamlConfig,
  event?: any,
  providerId?: string,
): SAML {
  return new SAML({
    entryPoint: config.entryPoint,
    issuer: config.entityId,
    callbackUrl: samlCallbackUrl(event, providerId),
    idpCert: config.idpCert.length === 1 ? config.idpCert[0] : config.idpCert,
    // The assertion must be signed. That is the one that is not negotiable: the
    // assertion is what carries the identity, and its signature covers the
    // subject, the conditions and the attributes together — node-saml checks
    // that the signature covers the assertion it then reads, which is the
    // defence against the signature-wrapping family of attacks.
    wantAssertionsSigned: true,
    // Signing the *response* around it as well is defence in depth, and off by
    // default because most providers do not do it: Entra ID and Okta both sign
    // the assertion alone unless told otherwise. Requiring it by default would
    // mean nearly every instance failing on its first attempt with nothing to
    // suggest why. Turn it on where the provider is configured to do both.
    wantAuthnResponseSigned: config.wantResponseSigned,
    audience: config.entityId,
    // Passed on, but do not rely on it: node-saml only compares `idpIssuer` for
    // logout messages — for an assertion it records the issuer and moves on.
    // The check that matters is made in the ACS endpoint, against the issuer it
    // reports back. (Verified against node-saml 5.1: `verifyIssuer` is called
    // from the LogoutRequest and LogoutResponse paths only.)
    idpIssuer: config.idpIssuer || undefined,
    identifierFormat: config.identifierFormat || null,
    signatureAlgorithm: config.signatureAlgorithm as any,
    acceptedClockSkewMs: Math.max(0, config.clockSkewSeconds) * 1000,
    disableRequestedAuthnContext: config.disableRequestedAuthnContext,
    // We do not sign our own requests: it needs a key pair on this side, most
    // providers do not require it, and an unsigned AuthnRequest gives away
    // nothing — the response is what carries the identity, and that is signed.
    racComparison: "exact",
    // Encrypted assertions, where the provider requires them. Some do by
    // policy — public administration and universities more often than most —
    // and without the key their assertion cannot even be read.
    ...(config.decryptionKey ? { decryptionPvk: config.decryptionKey } : {}),
  });
}

// Records that an assertion has been used, and says whether it had been used
// before. The insert is the check: the id is the primary key, so two requests
// racing with the same assertion cannot both win — the second one gets a
// duplicate-key error and is refused.
//
// Only needed for assertions we did not ask for. When we started the sign-in,
// the response is tied to our request; an unsolicited one is a bearer token
// with nothing tying it to anybody, and could otherwise be presented again.
export async function consumeAssertion(
  id: string,
  notOnOrAfter: Date | null,
): Promise<boolean> {
  if (!id) return false;
  const db = setupDatabase();
  // Kept until it could not be valid anyway, with an hour's grace for clocks.
  const expires =
    notOnOrAfter && !Number.isNaN(notOnOrAfter.getTime())
      ? new Date(notOnOrAfter.getTime() + 60 * 60 * 1000)
      : new Date(Date.now() + 60 * 60 * 1000);
  try {
    await db.execute(
      "INSERT INTO `saml_assertions_seen` (`id`, `expiresAt`) VALUES (?, ?)",
      [id.slice(0, 255), expires],
    );
  } catch (error: any) {
    if (error?.code === "ER_DUP_ENTRY") return false;
    throw error;
  }
  // Opportunistic tidying, on the way past.
  db.execute("DELETE FROM `saml_assertions_seen` WHERE `expiresAt` < NOW()").catch(
    () => {},
  );
  return true;
}

// What a provider sends back, flattened into the same shape OpenID Connect
// produces, so one set of provisioning rules serves both.
//
// SAML attribute names are rarely friendly: an address arrives as `email`, or
// `mail`, or the full `urn:oid:0.9.2342.19200300.100.1.3`, depending on who
// configured the provider. The defaults cover the common spellings and the
// mapping settings cover the rest.
export function profileFromAssertion(
  assertion: Record<string, any>,
  config: SamlConfig,
): SsoProfile | null {
  // node-saml puts the attributes at the top level and keeps the NameID in
  // `nameID`; multi-valued attributes arrive as arrays.
  const flat: Record<string, any> = { ...assertion };
  const attributes = (assertion as any).attributes;
  if (attributes && typeof attributes === "object") {
    Object.assign(flat, attributes);
  }

  const subject =
    pickClaim(flat, config.claimSubject || "nameID") ||
    pickClaim(flat, "nameID");

  const email = pickClaim(
    flat,
    config.claimEmail ||
      "email,mail,emailAddress,urn:oid:0.9.2342.19200300.100.1.3,http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress,nameID",
  )
    .trim()
    .toLowerCase();

  if (!subject || !email) return null;

  const name =
    pickClaim(
      flat,
      config.claimName ||
        "displayName,name,cn,urn:oid:2.16.840.1.113730.3.1.241,http://schemas.microsoft.com/identity/claims/displayname",
    ) ||
    [
      pickClaim(flat, "givenName,http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname"),
      pickClaim(flat, "sn,surname,http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname"),
    ]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    email.split("@")[0];

  let isAdmin = false;
  if (config.adminClaim && config.adminValue) {
    const value = flat[config.adminClaim];
    const entries = Array.isArray(value)
      ? value.map(String)
      : [String(value ?? "")];
    isAdmin = entries.includes(config.adminValue);
  }

  return { subject, email, name, isAdmin };
}
