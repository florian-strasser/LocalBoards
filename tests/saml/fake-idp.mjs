// A SAML 2.0 identity provider, for testing the service-provider side end to
// end. It signs real assertions with a real key, so the signature check being
// tested is the actual one.
//
// It can also be asked to misbehave, which is the more important half: a wrong
// key, a wrong audience, an expired window, a replay, and a signature-wrapping
// attempt. A test that only ever sends valid assertions proves very little
// about an implementation whose whole job is rejecting invalid ones.
import { createServer } from "node:http";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import zlib from "node:zlib";
import { SignedXml } from "xml-crypto";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

// A self-signed certificate, generated per run.
export function makeKeyPair() {
  const dir = mkdtempSync(join(tmpdir(), "saml-"));
  const key = join(dir, "key.pem");
  const cert = join(dir, "cert.pem");
  execFileSync("openssl", [
    "req", "-x509", "-newkey", "rsa:2048", "-nodes",
    "-keyout", key, "-out", cert, "-days", "2", "-subj", "/CN=fake-idp.test",
  ], { stdio: "ignore" });
  const pair = { privateKey: readFileSync(key, "utf8"), certificate: readFileSync(cert, "utf8"),
                 cleanup: () => rmSync(dir, { recursive: true, force: true }) };
  return pair;
}

const iso = (offsetSeconds = 0) => new Date(Date.now() + offsetSeconds * 1000).toISOString();

export function buildResponse({
  issuer, audience, recipient, inResponseTo,
  nameId = "alex@example.test",
  attributes = {},
  notBefore = -60, notOnOrAfter = 300,
  assertionId = "_" + randomUUID(),
  responseId = "_" + randomUUID(),
} = {}) {
  const attributeXml = Object.entries(attributes).map(([name, value]) => {
    const values = (Array.isArray(value) ? value : [value])
      .map((v) => `<saml:AttributeValue xsi:type="xs:string">${v}</saml:AttributeValue>`).join("");
    return `<saml:Attribute Name="${name}" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:unspecified">${values}</saml:Attribute>`;
  }).join("");

  const assertion = `<saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ID="${assertionId}" Version="2.0" IssueInstant="${iso()}">`
    + `<saml:Issuer>${issuer}</saml:Issuer>`
    + `<saml:Subject><saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">${nameId}</saml:NameID>`
    + `<saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">`
    + `<saml:SubjectConfirmationData ${inResponseTo ? `InResponseTo="${inResponseTo}" ` : ""}NotOnOrAfter="${iso(notOnOrAfter)}" Recipient="${recipient}"/>`
    + `</saml:SubjectConfirmation></saml:Subject>`
    + `<saml:Conditions NotBefore="${iso(notBefore)}" NotOnOrAfter="${iso(notOnOrAfter)}">`
    + `<saml:AudienceRestriction><saml:Audience>${audience}</saml:Audience></saml:AudienceRestriction></saml:Conditions>`
    + `<saml:AuthnStatement AuthnInstant="${iso()}" SessionIndex="${assertionId}">`
    + `<saml:AuthnContext><saml:AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport</saml:AuthnContextClassRef></saml:AuthnContext></saml:AuthnStatement>`
    + (attributeXml ? `<saml:AttributeStatement>${attributeXml}</saml:AttributeStatement>` : "")
    + `</saml:Assertion>`;

  const response = `<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="${responseId}" Version="2.0" IssueInstant="${iso()}" Destination="${recipient}"${inResponseTo ? ` InResponseTo="${inResponseTo}"` : ""}>`
    + `<saml:Issuer>${issuer}</saml:Issuer>`
    + `<samlp:Status><samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/></samlp:Status>`
    + assertion + `</samlp:Response>`;

  return { response, assertionId, responseId };
}

// Signs the assertion inside the response, the way providers do.
export function signAssertion(xml, assertionId, privateKey, { corruptAfterSigning = false } = {}) {
  const sig = new SignedXml({ privateKey, signatureAlgorithm: "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256" });
  sig.addReference({
    xpath: `//*[local-name(.)='Assertion']`,
    transforms: ["http://www.w3.org/2000/09/xmldsig#enveloped-signature", "http://www.w3.org/2001/10/xml-exc-c14n#"],
    digestAlgorithm: "http://www.w3.org/2001/04/xmlenc#sha256",
  });
  sig.canonicalizationAlgorithm = "http://www.w3.org/2001/10/xml-exc-c14n#";
  sig.computeSignature(xml, { location: { reference: `//*[local-name(.)='Assertion']/*[local-name(.)='Issuer']`, action: "after" } });
  let signed = sig.getSignedXml();
  if (corruptAfterSigning) {
    // Change the subject after signing: the signature no longer covers what the
    // document says, which is exactly what must be caught.
    signed = signed.replace("alex@example.test", "attacker@example.test");
  }
  return signed;
}

// Encrypts the assertion for the service provider's certificate, the way a
// provider configured for encryption does.
export function encryptAssertion(signedXml, certificatePem) {
  const xmlenc = require("xml-encryption");
  const assertion = signedXml.match(/<saml:Assertion[\s\S]*<\/saml:Assertion>/)[0];
  return new Promise((resolve, reject) => {
    xmlenc.encrypt(assertion, {
      rsa_pub: certificatePem,
      pem: certificatePem,
      encryptionAlgorithm: "http://www.w3.org/2001/04/xmlenc#aes256-cbc",
      keyEncryptionAlgorithm: "http://www.w3.org/2001/04/xmlenc#rsa-oaep-mgf1p",
    }, (err, encrypted) => {
      if (err) return reject(err);
      resolve(signedXml.replace(assertion,
        `<saml:EncryptedAssertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">${encrypted}</saml:EncryptedAssertion>`));
    });
  });
}

// The provider itself: a redirect endpoint that posts a signed response back.
export function startFakeIdp({ privateKey, issuer = "https://fake-idp.test/metadata", mutate = null } = {}) {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname === "/sso") {
      const relayState = url.searchParams.get("RelayState") || "";
      // A real sign-in starts with an AuthnRequest, and the answer has to name
      // the request it answers. Without one, this is a provider-initiated
      // sign-in and the response carries no InResponseTo — which is exactly the
      // difference the service provider is expected to notice.
      let inResponseTo = null;
      const samlRequest = url.searchParams.get("SAMLRequest");
      if (samlRequest) {
        const inflated = zlib.inflateRawSync(Buffer.from(samlRequest, "base64")).toString("utf8");
        inResponseTo = inflated.match(/\bID="([^"]+)"/)?.[1] ?? null;
      }
      // The service provider's ACS is where we post the answer; the test tells
      // us where through a query parameter so the provider needs no config.
      const recipient = url.searchParams.get("acs");
      const audience = url.searchParams.get("audience");
      let { response, assertionId } = buildResponse({ issuer, audience, recipient, inResponseTo, ...(mutate?.build ?? {}) });
      let signed = signAssertion(response, assertionId, mutate?.signWith ?? privateKey, mutate?.sign ?? {});
      if (mutate?.encryptFor) signed = await encryptAssertion(signed, mutate.encryptFor);
      if (mutate?.after) signed = mutate.after(signed);
      const encoded = Buffer.from(signed, "utf8").toString("base64");
      res.writeHead(200, { "content-type": "text/html" });
      return res.end(`<html><body onload="document.forms[0].submit()"><form method="post" action="${recipient}">`
        + `<input type="hidden" name="SAMLResponse" value="${encoded.replace(/"/g, "&quot;")}"/>`
        + `<input type="hidden" name="RelayState" value="${relayState.replace(/"/g, "&quot;")}"/>`
        + `<noscript><button type="submit">Continue</button></noscript></form></body></html>`);
    }
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "not_found" }));
  });
  return new Promise((r) => server.listen(0, "127.0.0.1", () =>
    r({ base: `http://127.0.0.1:${server.address().port}`, issuer, stop: () => new Promise((x) => server.close(x)) })));
}
