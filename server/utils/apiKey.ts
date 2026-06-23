import { createHash } from "node:crypto";

// API keys are high-entropy random tokens (a 32-char hex string, see
// server/api/auth/api-key/create.ts), not user passwords. For such tokens a
// single fast hash (SHA-256) is the right choice — it makes a leaked database
// useless for impersonation (you can't present a hash to authenticate) while
// keeping verification a fast, deterministic, indexed lookup. Slow password
// hashes (bcrypt) only matter for low-entropy secrets.
export function hashApiKey(key: string): string {
  return createHash("sha256").update(key, "utf8").digest("hex");
}
