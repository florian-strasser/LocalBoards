import { createHash } from "node:crypto";

// API keys are high-entropy random tokens (a 32-char hex string, see
// server/api/auth/api-key/create.ts), not user passwords. For such tokens a
// single fast hash (SHA-256) is the right choice — it makes a leaked database
// useless for impersonation (you can't present a hash to authenticate) while
// keeping verification a fast, deterministic, indexed lookup. Slow password
// hashes (bcrypt) only matter for low-entropy secrets.
//
// NOTE: CodeQL reports this as `js/insufficient-password-hash`. That is a false
// positive — the input is a high-entropy random token, not a password — so the
// alert is dismissed ("won't fix") in code scanning. A salted slow hash (bcrypt)
// would also be wrong here: it can't be looked up by an indexed equality match,
// so verification would have to compare against every stored key.
export function hashApiKey(key: string): string {
  return createHash("sha256").update(key, "utf8").digest("hex");
}
