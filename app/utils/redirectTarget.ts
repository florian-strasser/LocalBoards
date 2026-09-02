// Where to send somebody once they have signed in.
//
// Following a link or a bookmark to a board while signed out lands on the login
// page, and the address that was asked for travels with it in `?redirect=`. That
// makes it user input on its way into a navigation, which is exactly the shape
// an open redirect takes: a login page that will forward anywhere is a gift to
// anyone sending phishing links, because the link genuinely begins at this
// instance's own domain.
//
// So only a path on this instance is allowed through, and anything else quietly
// becomes the dashboard.

// Rejected because a browser reads them as somewhere else entirely:
// `//example.com` is protocol-relative, `/\example.com` is normalised to the
// same thing by some browsers, and anything with a scheme speaks for itself.
const ELSEWHERE = /^(?:\/\/|\/\\|[a-z][a-z0-9+.-]*:)/i;

// Landing back on the way in is a loop, not a destination.
const WAY_IN = ["/", "/sign-up", "/lost-password", "/reset-password"];

export function safeRedirect(target: unknown, fallback = "/dashboard/"): string {
  const value = typeof target === "string" ? target.trim() : "";

  if (!value.startsWith("/") || ELSEWHERE.test(value)) return fallback;

  // Compare the path alone: `/board/12?card=3` is a destination, and the query
  // it carries is none of this function's business.
  const path = value.split(/[?#]/)[0]!.replace(/\/{2,}/g, "/");
  const normalised = path.length > 1 ? path.replace(/\/+$/, "") : path;
  if (WAY_IN.some((entry) => normalised === entry || normalised.startsWith(`${entry}/`)))
    return fallback;

  return value;
}
