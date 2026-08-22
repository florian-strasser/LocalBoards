import { listProviders } from "../../../utils/ssoProviders";

// What the sign-in page needs: which providers this instance offers, what to
// call each, and where its button goes. Deliberately an endpoint rather than
// public runtime config — the providers are named at runtime, and the public
// config is fixed at build time.
//
// Unauthenticated by necessity: it is read by the page people sign in on. It
// carries no issuer, no client id and no secret — only what has to be on a
// button. The e-mail domains are not returned either: they would let anyone
// enumerate which organisations use this instance.
export default defineEventHandler((event) => {
  const providers = listProviders(event).map((provider) => ({
    id: provider.id,
    kind: provider.kind,
    label: provider.label,
    start:
      provider.kind === "oidc"
        ? `/api/auth/sso/start?provider=${encodeURIComponent(provider.id)}`
        : `/api/auth/saml/start?provider=${encodeURIComponent(provider.id)}`,
  }));

  return {
    providers,
    // Whether typing an address can route somebody to their own provider.
    routing: listProviders(event).some((provider) => provider.domains.length),
    // Kept for anything still reading the older shape.
    enabled: providers.some((provider) => provider.kind === "oidc"),
    label: providers.find((provider) => provider.kind === "oidc")?.label ?? "",
    saml: {
      enabled: providers.some((provider) => provider.kind === "saml"),
      label: providers.find((provider) => provider.kind === "saml")?.label ?? "",
    },
  };
});
