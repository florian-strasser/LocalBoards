// The one address the provider is told to send people back to. It has to match
// what is registered there exactly — a trailing slash or a stray port is enough
// for a provider to refuse the request — so it is built in one place from the
// instance's own URL rather than from whatever host a request happens to carry.
export function ssoRedirectUri(event?: any): string {
  const base = String(useRuntimeConfig(event).boardsUrl || "").replace(
    /\/+$/,
    "",
  );
  return `${base}/api/auth/sso/callback`;
}
