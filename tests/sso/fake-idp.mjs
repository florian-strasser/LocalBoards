// A small OpenID Connect provider, for testing the SSO flow end to end without
// reaching for anybody's cloud. It implements exactly the four things the flow
// touches: discovery, authorize, token and userinfo.
//
// It is deliberately strict about what LokalBoards sends it — PKCE, nonce,
// client authentication, the redirect URI — because a test provider that
// accepts anything proves nothing.
import { createServer } from "node:http";
import { createHash, randomBytes } from "node:crypto";

export function startFakeIdp({
  clientId = "lokalboards-test",
  clientSecret = "test-secret",
  user = { sub: "u-1", email: "alex@example.test", name: "Alex Morgan" },
  extraClaims = {},
  // Set to leave a claim out of the ID token, so the flow has to ask userinfo.
  sparseIdToken = false,
  // A plain OAuth 2.0 provider: no discovery, no ID token, and a profile
  // endpoint that answers with its own field names rather than OIDC claims.
  // `profile` is served as-is from /userinfo.
  oauth2Only = false,
  profile = null,
  // Some OAuth 2.0 providers answer the token endpoint with a form-encoded
  // body unless asked for JSON. GitHub is the well-known one.
  formEncodedTokens = false,
} = {}) {
  const codes = new Map();
  const seen = { authorize: null, token: null };

  const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const json = (body, status = 200) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
    };
    const issuer = `http://127.0.0.1:${server.address().port}`;

    if (url.pathname === "/.well-known/openid-configuration") {
      return json({
        issuer,
        authorization_endpoint: `${issuer}/authorize`,
        token_endpoint: `${issuer}/token`,
        userinfo_endpoint: `${issuer}/userinfo`,
        response_types_supported: ["code"],
        subject_types_supported: ["public"],
        id_token_signing_alg_values_supported: ["RS256"],
      });
    }

    if (url.pathname === "/authorize") {
      const q = Object.fromEntries(url.searchParams);
      seen.authorize = q;
      // The things a real provider insists on.
      for (const required of ["client_id", "redirect_uri", "response_type", "state", "code_challenge"]) {
        if (!q[required]) return json({ error: `missing_${required}` }, 400);
      }
      if (q.client_id !== clientId) return json({ error: "unknown_client" }, 400);
      if (q.code_challenge_method !== "S256") return json({ error: "pkce_required" }, 400);

      const code = randomBytes(16).toString("hex");
      codes.set(code, { challenge: q.code_challenge, nonce: q.nonce, redirect: q.redirect_uri });
      const back = new URL(q.redirect_uri);
      back.searchParams.set("code", code);
      back.searchParams.set("state", q.state);
      res.writeHead(302, { location: back.toString() });
      return res.end();
    }

    if (url.pathname === "/token") {
      const body = await new Promise((resolve) => {
        let raw = ""; req.on("data", (c) => (raw += c)); req.on("end", () => resolve(new URLSearchParams(raw)));
      });
      const params = Object.fromEntries(body);
      seen.token = params;

      if (params.client_id !== clientId || params.client_secret !== clientSecret) {
        return json({ error: "invalid_client" }, 401);
      }
      const record = codes.get(params.code);
      if (!record) return json({ error: "invalid_grant" }, 400);
      codes.delete(params.code); // one use only, like the real thing
      if (params.redirect_uri !== record.redirect) return json({ error: "redirect_uri_mismatch" }, 400);

      // PKCE: the verifier has to hash to the challenge sent at /authorize.
      const hashed = createHash("sha256").update(String(params.code_verifier || "")).digest("base64url");
      if (hashed !== record.challenge) return json({ error: "invalid_pkce" }, 400);

      const now = Math.floor(Date.now() / 1000);
      const claims = {
        iss: issuer, sub: user.sub, aud: clientId, iat: now, exp: now + 300,
        nonce: record.nonce,
        ...(sparseIdToken ? {} : { email: user.email, name: user.name }),
        ...extraClaims,
      };
      const accessToken = "at-" + randomBytes(8).toString("hex");
      if (oauth2Only) {
        const payload = { token_type: "Bearer", expires_in: 300, access_token: accessToken };
        if (formEncodedTokens && !String(req.headers.accept || "").includes("application/json")) {
          res.writeHead(200, { "content-type": "application/x-www-form-urlencoded" });
          return res.end(new URLSearchParams(payload).toString());
        }
        return json(payload);
      }
      const part = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
      const idToken = `${part({ alg: "RS256", typ: "JWT" })}.${part(claims)}.${randomBytes(32).toString("base64url")}`;
      return json({ token_type: "Bearer", expires_in: 300, access_token: accessToken, id_token: idToken });
    }

    if (url.pathname === "/userinfo") {
      if (!String(req.headers.authorization || "").startsWith("Bearer ")) {
        return json({ error: "unauthorized" }, 401);
      }
      if (profile) return json(profile);
      return json({ sub: user.sub, email: user.email, name: user.name, ...extraClaims });
    }

    json({ error: "not_found" }, 404);
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const issuer = `http://127.0.0.1:${server.address().port}`;
      resolve({ issuer, seen, stop: () => new Promise((r) => server.close(r)) });
    });
  });
}
