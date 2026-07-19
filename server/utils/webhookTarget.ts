import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

// The webhook URL is supplied by a user but fetched by the SERVER, from inside
// whatever network the instance runs in. Without a check that is a
// server-side request forgery primitive: cloud metadata (169.254.169.254),
// admin panels on localhost, anything on the private LAN. So a target is only
// accepted if it is http(s) AND every address its host resolves to is a public
// unicast address.
//
// Checked twice on purpose: when the subscription is created (so the user gets
// an immediate error) and again before each delivery (so a hostname that later
// starts resolving to an internal address — DNS rebinding — is still refused).

const MAX_URL_LENGTH = 2048;

function isPrivateV4(ip: string): boolean {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => Number.isNaN(n))) return true;
  const [a, b] = p;
  if (a === 0 || a === 10 || a === 127) return true; // this-network, private, loopback
  if (a === 169 && b === 254) return true; // link-local incl. cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a === 192 && b === 0) return true; // IETF protocol assignments
  if (a >= 224) return true; // multicast, reserved, broadcast
  return false;
}

function isPrivateV6(ip: string): boolean {
  const addr = ip.toLowerCase().split("%")[0];
  if (addr === "::" || addr === "::1") return true; // unspecified, loopback
  if (addr.startsWith("fe80")) return true; // link-local
  if (/^f[cd]/.test(addr)) return true; // unique local
  if (addr.startsWith("ff")) return true; // multicast
  // IPv4-mapped (::ffff:127.0.0.1) must be judged by its v4 half.
  const mapped = addr.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateV4(mapped[1]);
  return false;
}

export function isPrivateAddress(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4) return isPrivateV4(ip);
  if (kind === 6) return isPrivateV6(ip);
  return true; // not an IP literal we understand → refuse
}

export type WebhookTargetCheck = { ok: true } | { ok: false; reason: string };

/**
 * Validate a webhook URL: shape, scheme, length, and that its host does not
 * resolve into a private/loopback/link-local range.
 */
export async function checkWebhookTarget(
  url: unknown,
): Promise<WebhookTargetCheck> {
  if (!url || typeof url !== "string" || url.length > MAX_URL_LENGTH) {
    return {
      ok: false,
      reason: "A webhook URL (max 2048 characters) is required",
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, reason: "The webhook URL is not a valid URL" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      ok: false,
      reason: "The webhook URL must start with http:// or https://",
    };
  }

  // Strip the brackets IPv6 literals carry in a URL host.
  const host = parsed.hostname.replace(/^\[|\]$/g, "");

  if (isIP(host)) {
    return isPrivateAddress(host)
      ? { ok: false, reason: "The webhook URL must point to a public address" }
      : { ok: true };
  }

  let addresses: { address: string }[];
  try {
    addresses = await lookup(host, { all: true });
  } catch {
    return { ok: false, reason: "The webhook host could not be resolved" };
  }

  if (addresses.length === 0) {
    return { ok: false, reason: "The webhook host could not be resolved" };
  }
  // Every address must be public — one internal answer is enough to abuse.
  if (addresses.some((a) => isPrivateAddress(a.address))) {
    return {
      ok: false,
      reason: "The webhook URL must point to a public address",
    };
  }

  return { ok: true };
}
