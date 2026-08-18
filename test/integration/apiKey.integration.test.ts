import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { db, migrate, resetData, insertUser } from "./db";
import { verifyApiKey, getApiKeyUser } from "../../server/utils/auth";
import { hashApiKey } from "../../server/utils/apiKey";
import { fakeEvent } from "./event";

beforeAll(async () => {
  await migrate();
});
beforeEach(async () => {
  await resetData();
});

async function insertApiKey(opts: {
  id: string;
  key: string;
  userId: string;
  expiresAt?: Date | null;
}) {
  await db().execute(
    "INSERT INTO `apikey` (`id`,`name`,`start`,`key`,`expiresAt`,`referenceId`) VALUES (?,?,?,?,?,?)",
    [opts.id, "test key", opts.key.substring(0, 8), opts.key, opts.expiresAt ?? null, opts.userId],
  );
}

describe("verifyApiKey (integration, real MySQL)", () => {
  it("verifies a hashed key and returns the owning user", async () => {
    await insertUser("u1");
    const plain = "abcdef0123456789abcdef0123456789";
    await insertApiKey({ id: "k1", key: hashApiKey(plain), userId: "u1" });

    const res = await verifyApiKey(plain);
    expect(res.key?.userId).toBe("u1");
  });

  it("the 0002 legacy-key migration hashes plaintext keys to match the verifier", async () => {
    await insertUser("u1");
    // A pre-hashing key stored in plaintext (32-char token).
    const plain = "abcdef0123456789abcdef012345aaaa";
    expect(plain).toHaveLength(32);
    await insertApiKey({ id: "k1", key: plain, userId: "u1" });

    // The exact UPDATE the 0002 migration applies.
    await db().execute(
      "UPDATE `apikey` SET `key` = SHA2(`key`, 256) WHERE LENGTH(`key`) = 32",
    );

    // MySQL's SHA2(x,256) must equal Node's hashApiKey, otherwise verification
    // would break after migration.
    const [rows]: any = await db().execute(
      "SELECT `key` FROM `apikey` WHERE `id` = ?",
      ["k1"],
    );
    expect(rows[0].key).toBe(hashApiKey(plain));

    // And the key verifies via the hashed lookup (no plaintext fallback).
    const res = await verifyApiKey(plain);
    expect(res.key?.userId).toBe("u1");
  });

  it("rejects an unknown key", async () => {
    const res = await verifyApiKey("unknownkey000000000000000000000a");
    expect(res.error).toBeTruthy();
  });

  it("rejects an expired key", async () => {
    await insertUser("u1");
    const plain = "expiredkey00000000000000000000aa";
    await insertApiKey({
      id: "k1",
      key: hashApiKey(plain),
      userId: "u1",
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    });

    const res = await verifyApiKey(plain);
    expect(res.error).toBeTruthy();
  });
});

describe("getApiKeyUser (integration, real MySQL)", () => {
  const plain = "abcdef0123456789abcdef0123456789";

  beforeEach(async () => {
    await insertUser("u1");
    await insertApiKey({ id: "k1", key: hashApiKey(plain), userId: "u1" });
  });

  it("resolves a key from the x-api-key header", async () => {
    const res = await getApiKeyUser(fakeEvent({ headers: { "x-api-key": plain } }));
    expect(res?.user?.id).toBe("u1");
  });

  // Le Chat and the OpenAI Responses API can only send a bearer token, so the
  // same key has to work that way round or those clients cannot connect at all.
  it("resolves the same key from an Authorization: Bearer header", async () => {
    const res = await getApiKeyUser(
      fakeEvent({ headers: { authorization: `Bearer ${plain}` } }),
    );
    expect(res?.user?.id).toBe("u1");
  });

  it("accepts the bearer scheme case-insensitively", async () => {
    const res = await getApiKeyUser(
      fakeEvent({ headers: { authorization: `bearer ${plain}` } }),
    );
    expect(res?.user?.id).toBe("u1");
  });

  it("prefers x-api-key when both headers are present", async () => {
    const res = await getApiKeyUser(
      fakeEvent({
        headers: { "x-api-key": plain, authorization: "Bearer not-a-key" },
      }),
    );
    expect(res?.user?.id).toBe("u1");
  });

  it("returns null for a bearer value that is not a key", async () => {
    const res = await getApiKeyUser(
      fakeEvent({ headers: { authorization: "Bearer not-a-key" } }),
    );
    expect(res).toBeNull();
  });

  it("returns null when neither header is present", async () => {
    expect(await getApiKeyUser(fakeEvent())).toBeNull();
  });
});
