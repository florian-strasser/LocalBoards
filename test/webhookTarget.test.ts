import { describe, it, expect } from "vitest";
import {
  checkWebhookTarget,
  isPrivateAddress,
} from "../server/utils/webhookTarget";

// The webhook URL is user-supplied but fetched by the server, so without these
// checks it is an SSRF primitive pointed at the instance's own network.
describe("webhook target validation", () => {
  it("rejects non-http(s) schemes", async () => {
    for (const url of ["file:///etc/passwd", "ftp://x.example/", "gopher://x/"]) {
      expect((await checkWebhookTarget(url)).ok).toBe(false);
    }
  });

  it("rejects loopback, private, link-local and metadata addresses", async () => {
    const blocked = [
      "http://127.0.0.1/hook",
      "http://localhost/hook", // resolves to loopback
      "http://169.254.169.254/latest/meta-data/", // cloud metadata
      "http://10.0.0.5/admin",
      "http://172.16.4.4/",
      "http://192.168.1.1/",
      "http://[::1]:6379/",
      "http://0.0.0.0/",
      "http://100.64.0.1/", // CGNAT
    ];
    for (const url of blocked) {
      const result = await checkWebhookTarget(url);
      expect(result.ok, `${url} should be refused`).toBe(false);
    }
  });

  it("classifies IPv4-mapped IPv6 loopback as private", () => {
    expect(isPrivateAddress("::ffff:127.0.0.1")).toBe(true);
    expect(isPrivateAddress("::ffff:8.8.8.8")).toBe(false);
  });

  it("accepts a public address", async () => {
    expect((await checkWebhookTarget("https://8.8.8.8/hook")).ok).toBe(true);
  });

  it("rejects junk input", async () => {
    for (const url of ["", "not a url", null, undefined, 42, "x".repeat(3000)]) {
      expect((await checkWebhookTarget(url as any)).ok).toBe(false);
    }
  });
});
