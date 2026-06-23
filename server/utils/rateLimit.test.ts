import { describe, it, expect } from "vitest";
import { createRateLimiter } from "./rateLimit";

describe("createRateLimiter", () => {
  describe("consume (every request counts)", () => {
    it("allows up to max requests and blocks the next one", () => {
      const rl = createRateLimiter({ max: 3, windowMs: 1000 });
      expect(rl.consume("ip", 0).allowed).toBe(true); // 1
      expect(rl.consume("ip", 0).allowed).toBe(true); // 2
      expect(rl.consume("ip", 0).allowed).toBe(true); // 3
      expect(rl.consume("ip", 0).allowed).toBe(false); // 4 — blocked
    });

    it("reports remaining and retryAfterMs", () => {
      const rl = createRateLimiter({ max: 2, windowMs: 1000 });
      expect(rl.consume("ip", 0)).toMatchObject({ allowed: true, remaining: 1 });
      expect(rl.consume("ip", 0)).toMatchObject({ allowed: true, remaining: 0 });
      const blocked = rl.consume("ip", 200);
      expect(blocked.allowed).toBe(false);
      expect(blocked.retryAfterMs).toBe(800); // resetAt (1000) - now (200)
    });

    it("resets after the window elapses", () => {
      const rl = createRateLimiter({ max: 1, windowMs: 1000 });
      expect(rl.consume("ip", 0).allowed).toBe(true);
      expect(rl.consume("ip", 500).allowed).toBe(false); // same window
      expect(rl.consume("ip", 1000).allowed).toBe(true); // expired -> reset
    });

    it("tracks keys independently", () => {
      const rl = createRateLimiter({ max: 1, windowMs: 1000 });
      expect(rl.consume("a", 0).allowed).toBe(true);
      expect(rl.consume("b", 0).allowed).toBe(true); // different key, own budget
      expect(rl.consume("a", 0).allowed).toBe(false);
    });
  });

  describe("peek (does not count)", () => {
    it("does not consume budget", () => {
      const rl = createRateLimiter({ max: 1, windowMs: 1000 });
      // Peeking any number of times must not exhaust the budget.
      expect(rl.peek("ip", 0).allowed).toBe(true);
      expect(rl.peek("ip", 0).allowed).toBe(true);
      expect(rl.consume("ip", 0).allowed).toBe(true); // first real hit allowed
    });

    it("reports blocked once the budget is exhausted by consume", () => {
      const rl = createRateLimiter({ max: 2, windowMs: 1000 });
      rl.consume("ip", 0); // 1 failure
      rl.consume("ip", 0); // 2 failures -> at max
      expect(rl.peek("ip", 0).allowed).toBe(false); // next would be blocked
    });

    it("models login: successful logins (peek only) never lock out", () => {
      const rl = createRateLimiter({ max: 3, windowMs: 1000 });
      // 100 successful logins from one IP: peek each time, never consume.
      for (let i = 0; i < 100; i++) {
        expect(rl.peek("office-ip", 0).allowed).toBe(true);
      }
    });
  });
});
