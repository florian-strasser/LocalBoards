import { describe, it, expect } from "vitest";
import { hashApiKey } from "./apiKey";

describe("hashApiKey", () => {
  it("produces a 64-char lowercase hex SHA-256 digest", () => {
    const hash = hashApiKey("a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic for the same input", () => {
    const key = "deadbeefdeadbeefdeadbeefdeadbeef";
    expect(hashApiKey(key)).toBe(hashApiKey(key));
  });

  it("produces different hashes for different inputs", () => {
    expect(hashApiKey("key-one")).not.toBe(hashApiKey("key-two"));
  });

  it("matches the known SHA-256 digest of a sample key", () => {
    // sha256("test") — guards against accidentally changing the algorithm.
    expect(hashApiKey("test")).toBe(
      "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
    );
  });

  it("does not return the input verbatim (i.e. it actually hashes)", () => {
    const key = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4";
    expect(hashApiKey(key)).not.toBe(key);
  });
});
