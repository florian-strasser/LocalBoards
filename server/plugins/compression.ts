import {
  getRequestHeader,
  getResponseHeader,
  setResponseHeader,
  appendResponseHeader,
} from "h3";
import { promisify } from "node:util";
import { brotliCompress, gzip, constants } from "node:zlib";

const brotli = promisify(brotliCompress);
const gzipAsync = promisify(gzip);

// Only compress text-like payloads (HTML, JSON, JS, CSS, SVG, XML). Binary
// types such as images or already-compressed downloads are left untouched.
const COMPRESSIBLE =
  /^(?:text\/|application\/(?:json|javascript|xml|ld\+json|manifest\+json)|image\/svg\+xml)/i;

// Don't bother compressing tiny responses — the overhead isn't worth it.
const MIN_SIZE = 1024;

// Compresses dynamic responses (API JSON, SSR HTML) with brotli or gzip
// depending on what the client accepts. Static assets are handled separately by
// nitro.compressPublicAssets.
export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook("beforeResponse", async (event, response) => {
    // Never interfere with the Socket.IO transport.
    if (event.path?.startsWith("/socket.io")) return;

    const body = response.body;
    if (body == null) return;

    // Only handle fully-buffered string/Buffer bodies, not streams.
    let buffer: Buffer;
    if (typeof body === "string") buffer = Buffer.from(body);
    else if (Buffer.isBuffer(body)) buffer = body;
    else return;

    if (buffer.length < MIN_SIZE) return;

    // Skip if something already set an encoding.
    if (getResponseHeader(event, "content-encoding")) return;

    const contentType = String(getResponseHeader(event, "content-type") || "");
    if (!COMPRESSIBLE.test(contentType)) return;

    const accept = String(getRequestHeader(event, "accept-encoding") || "");
    let encoding: "br" | "gzip" | undefined;
    if (/\bbr\b/.test(accept)) encoding = "br";
    else if (/\bgzip\b/.test(accept)) encoding = "gzip";
    if (!encoding) return;

    const compressed =
      encoding === "br"
        ? await brotli(buffer, {
            params: {
              // Quality 4 is a good speed/ratio balance for dynamic content
              // (quality 11 is meant for build-time static assets).
              [constants.BROTLI_PARAM_QUALITY]: 4,
              [constants.BROTLI_PARAM_SIZE_HINT]: buffer.length,
            },
          })
        : await gzipAsync(buffer);

    setResponseHeader(event, "content-encoding", encoding);
    setResponseHeader(event, "content-length", String(compressed.length));
    appendResponseHeader(event, "vary", "accept-encoding");
    response.body = compressed;
  });
});
