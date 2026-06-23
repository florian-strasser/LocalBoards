// Minimal fake h3 event for exercising server utils that read request headers
// and cookies. Provides both the web `headers.get(...)` API (used directly by
// our code) and `node.req.headers` (used by h3 helpers like getCookie /
// getRequestIP).
export function fakeEvent(
  opts: {
    method?: string;
    headers?: Record<string, string>;
    cookies?: Record<string, string>;
  } = {},
): any {
  const { method = "GET", headers = {}, cookies = {} } = opts;

  const webHeaders = new Headers(headers);
  const nodeHeaders: Record<string, string> = {};
  for (const [k, v] of webHeaders.entries()) nodeHeaders[k] = v;

  const cookieHeader = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
  if (cookieHeader) nodeHeaders.cookie = cookieHeader;

  const res = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    setHeader(name: string, value: string) {
      this.headers[name] = value;
    },
  };

  return {
    headers: webHeaders,
    req: { method },
    res,
    node: {
      req: { method, headers: nodeHeaders, socket: { remoteAddress: "127.0.0.1" } },
      res,
    },
  };
}
