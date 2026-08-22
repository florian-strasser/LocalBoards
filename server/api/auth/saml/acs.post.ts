import { createHash } from "node:crypto";
import { readBody, sendRedirect } from "h3";
import { createSession } from "../../../utils/auth";
import { domainAllowed, findOrCreateUser } from "../../../utils/sso";
import {
  buildSaml,
  consumeAssertion,
  profileFromAssertion,
  readSamlConfig,
  samlIsUsable,
} from "../../../utils/saml";
import { findProvider, listProviders } from "../../../utils/ssoProviders";
import type { SamlConfig } from "../../../utils/saml";

// Step two: the assertion consumer service. The provider POSTs a signed
// response here through the browser.
//
// `validatePostResponseAsync` is where the security lives: it checks the XML
// signature against the configured certificate, that the signature covers the
// assertion actually being read (which is the defence against signature
// wrapping), the audience, the destination, the conditions and the clock. It
// throws on anything it does not like, and everything it throws for is a
// refusal here — there is no partial acceptance.
const fail = (event: any, reason: string) =>
  sendRedirect(event, `/?sso_error=${encodeURIComponent(reason)}`, 302);

export default defineEventHandler(async (event) => {
  // Which provider this response belongs to. With one configured it is that
  // one; with several, the ACS carries the provider's name — `?provider=partner`
  // — because each is registered with its own URL at its own end.
  const requested = String(getQuery(event).provider || "");
  const provider = requested ? findProvider(requested, event) : null;
  let config: SamlConfig = (provider?.config as SamlConfig) ?? readSamlConfig(event);

  if (requested && (!provider || provider.kind !== "saml")) {
    event.res.statusCode = 404;
    return { error: "saml_not_configured" };
  }
  if (!samlIsUsable(config)) {
    event.res.statusCode = 404;
    return { error: "saml_not_configured" };
  }

  try {
    const body = await readBody(event);
    const samlResponse = String(body?.SAMLResponse || "");
    if (!samlResponse) return fail(event, "no_assertion");

    const saml = buildSaml(config, event, provider?.id);
    const { profile: assertion } = await saml.validatePostResponseAsync({
      SAMLResponse: samlResponse,
      RelayState: String(body?.RelayState || ""),
    });

    if (!assertion) return fail(event, "no_assertion");

    // An assertion carrying no `InResponseTo` answers no request of ours: it is
    // a provider-initiated sign-in, somebody arriving from their portal. That is
    // a normal thing to want and an instance can allow it, but it is a bearer
    // token with nothing tying it to this browser, so it is refused unless
    // switched on and each one may be used only once.
    const solicited = Boolean((assertion as any).inResponseTo);
    if (!solicited) {
      if (!config.allowIdpInitiated) {
        logger.warn("Unsolicited SAML assertion refused (not enabled)");
        return fail(event, "idp_initiated_disabled");
      }
      // The assertion's own id, which SAML requires to be unique. Where a
      // provider leaves it off, the assertion's bytes are hashed instead — a
      // replay is the same bytes, and two genuine sign-ins never are, since
      // each carries its own instant.
      const parsed = (assertion as any).getAssertion?.();
      const assertionId =
        String(parsed?.Assertion?.$?.ID ?? "") ||
        (typeof (assertion as any).getAssertionXml === "function"
          ? "sha256:" +
            createHash("sha256")
              .update(String((assertion as any).getAssertionXml()))
              .digest("hex")
          : "");
      const window = (assertion as any).sessionNotOnOrAfter
        ? new Date((assertion as any).sessionNotOnOrAfter)
        : null;
      if (!assertionId || !(await consumeAssertion(assertionId, window))) {
        logger.warn("Unsolicited SAML assertion replayed or unidentifiable");
        return fail(event, "assertion_replayed");
      }
    }

    // Pin the provider by name as well as by key, where a name is configured.
    // The signature proves the assertion came from whoever holds that private
    // key; this proves it was issued by the entity we expect. node-saml does
    // not do it for assertions — it compares `idpIssuer` only for logout
    // messages — so it is done here, against the issuer it reports.
    if (
      config.idpIssuer &&
      String((assertion as any).issuer || "") !== config.idpIssuer
    ) {
      logger.warn(
        "SAML assertion from an unexpected issuer:",
        String((assertion as any).issuer || "(none)"),
      );
      return fail(event, "issuer_mismatch");
    }

    const profile = profileFromAssertion(assertion as any, config);
    if (!profile) return fail(event, "no_email");
    if (!domainAllowed(profile.email, config)) {
      return fail(event, "domain_not_allowed");
    }

    const result = await findOrCreateUser(profile, config, "saml");
    if ("error" in result) return fail(event, result.error);

    const session = await createSession(event, result.userId);
    if (session.error) {
      logger.error("SAML session creation failed:", session.error);
      return fail(event, "session_failed");
    }

    // `RelayState` is where the provider was asked to send us back to, and it is
    // echoed by the provider rather than trusted from it: anything that is not a
    // path on this instance goes to the dashboard instead, so a crafted response
    // cannot use us as an open redirect.
    const relay = String(body?.RelayState || "");
    const destination = /^\/[^/\\]/.test(relay) ? relay : "/dashboard/";
    return sendRedirect(event, destination, 302);
  } catch (error) {
    // node-saml throws for a bad signature, a wrong audience, an expired
    // assertion and a replayed one alike. The visitor is told the sign-in could
    // not be verified; the detail goes to the log, where it belongs.
    logger.error("SAML assertion rejected:", error);
    return fail(event, "assertion_invalid");
  }
});
