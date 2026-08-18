import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

// The token that goes in an invitation link. 256 bits of randomness, hex
// encoded, so it is unguessable and safe to put in a URL.
export function createInviteToken(): string {
  return randomBytes(32).toString("hex");
}

// Only the hash is stored. The token is a high-entropy random value rather than
// a password, so one fast hash is the right choice here: a leaked database
// cannot be used to accept an invitation, and verification remains an indexed
// equality lookup. The same reasoning as `hashApiKey`, and the same CodeQL
// false positive applies.
export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

// Compares two hashes without leaking where they first differ. The lookup is by
// indexed equality, so this is belt and braces rather than the main defence.
export function tokensMatch(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}
