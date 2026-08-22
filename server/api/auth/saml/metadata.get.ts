import { buildSaml, readSamlConfig, samlIsUsable } from "../../../utils/saml";
import { findProvider } from "../../../utils/ssoProviders";

// The document to hand an administrator setting this up at the other end: our
// entity id, where to send assertions, and which name identifier we want.
// Most providers can be pointed at this URL and configure themselves from it.
//
// It carries no secrets — it is the public half of the arrangement, and the
// same information the provider would otherwise be typed by hand.
// node-saml wants the certificate with its PEM armour here, and administrators
// paste it either way.
const wrapCert = (cert: string) =>
  cert.includes("-----BEGIN")
    ? cert
    : `-----BEGIN CERTIFICATE-----\n${cert.match(/.{1,64}/g)?.join("\n") ?? ""}\n-----END CERTIFICATE-----`;

export default defineEventHandler((event) => {
  const requested = String(getQuery(event).provider || "");
  const provider = requested ? findProvider(requested, event) : null;
  if (requested && (!provider || provider.kind !== "saml")) {
    event.res.statusCode = 404;
    return { error: "saml_not_configured" };
  }
  const config: any = (provider?.config as any) ?? readSamlConfig(event);
  if (!samlIsUsable(config)) {
    event.res.statusCode = 404;
    return { error: "saml_not_configured" };
  }

  // The encryption certificate goes in the document when one is configured:
  // that is how a provider learns which key to encrypt assertions for. Without
  // it the element is simply absent, which is what an unencrypted arrangement
  // looks like.
  const xml = buildSaml(config, event, provider?.id).generateServiceProviderMetadata(
    config.decryptionCert ? wrapCert(config.decryptionCert) : null,
    null,
  );
  setHeader(event, "content-type", "application/samlmetadata+xml");
  setHeader(
    event,
    "content-disposition",
    'inline; filename="lokalboards-sp-metadata.xml"',
  );
  return xml;
});
