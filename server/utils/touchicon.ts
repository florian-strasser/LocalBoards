import zlib from "node:zlib";

// The touch icon (apple-touch-icon / PNG favicon fallback) is generated at
// runtime so it picks up the instance's configured primary colour
// (NUXT_PUBLIC_COLOR_PRIMARY), which a prebuilt Docker image can't know at build
// time. Rather than pull in a native SVG rasterizer — which would ship a
// per-architecture binary and break the cross-arch, portable-.output Docker
// build — we exploit the fact that the icon is just a white logo on a solid
// background: the white logo is pre-rendered once into a colour-independent
// alpha mask (below), and at request time we composite it over the primary
// colour and encode a PNG with Node's built-in zlib. No dependency, no binary.
//
// TOUCHICON_ALPHA is the 512×512, 8-bit alpha channel of the white logo on a
// transparent background, deflated and base64-encoded. Regenerate it with
// scripts/gen-touchicon-template.mjs whenever the logo changes.
const SIZE = 512;

const TOUCHICON_ALPHA_B64 =
  "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";

// Decode the alpha mask once. Lazily so the base64 → inflate only happens on
// first icon request, not at module load for every worker.
let alphaMask: Buffer | null = null;
function getAlphaMask(): Buffer {
  if (!alphaMask) {
    alphaMask = zlib.inflateSync(Buffer.from(TOUCHICON_ALPHA_B64, "base64"));
  }
  return alphaMask;
}

// Standard PNG CRC-32 (polynomial 0xEDB88320).
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "latin1");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([length, typeBuf, data, crc]);
}

// Parse a #rgb / #rrggbb colour to [r, g, b], defaulting to the brand blue.
function parseHexColor(hex: string): [number, number, number] {
  const cleaned = String(hex).trim().replace(/^#/, "");
  const full =
    cleaned.length === 3
      ? cleaned.split("").map((c) => c + c).join("")
      : cleaned;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return [0x00, 0x66, 0xcc];
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

// Cache the encoded PNG per colour — the icon is identical for every request on
// an instance, so we only composite/encode once.
const pngCache = new Map<string, Buffer>();

/** Render the touch icon as an opaque PNG with the given hex background colour. */
export function renderTouchiconPng(hexColor: string): Buffer {
  const [r, g, b] = parseHexColor(hexColor);
  const key = `${r},${g},${b}`;
  const cached = pngCache.get(key);
  if (cached) return cached;

  const alpha = getAlphaMask();
  const stride = SIZE * 4;
  // Raw scanlines, each prefixed with filter-type 0 (None).
  const raw = Buffer.alloc((stride + 1) * SIZE);
  let o = 0;
  for (let y = 0; y < SIZE; y++) {
    raw[o++] = 0;
    for (let x = 0; x < SIZE; x++) {
      // Composite white (the logo) over the solid background using the mask:
      // out = bg + (255 - bg) * a. Result is fully opaque.
      const a = alpha[y * SIZE + x]! / 255;
      raw[o++] = Math.round(r + (255 - r) * a);
      raw[o++] = Math.round(g + (255 - g) * a);
      raw[o++] = Math.round(b + (255 - b) * a);
      raw[o++] = 255;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0); // width
  ihdr.writeUInt32BE(SIZE, 4); // height
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  // bytes 10-12 (compression / filter / interlace) stay 0

  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", zlib.deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);

  pngCache.set(key, png);
  return png;
}
