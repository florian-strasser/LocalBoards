// Regenerates the touch-icon alpha-mask template embedded in
// server/utils/touchicon.ts (TOUCHICON_ALPHA_B64). Run this only when the logo
// design changes — the app itself doesn't need it at build or runtime.
//
// The touch icon is a white logo on a solid primary-colour background. We render
// just the white logo on transparency once, keep its 8-bit alpha channel as a
// colour-independent mask (deflated + base64), and composite it over the runtime
// colour when serving the PNG. That keeps the Docker image free of a native SVG
// rasterizer and portable across architectures.
//
// Requires ImageMagick (`magick`) with an SVG delegate (rsvg). Usage:
//   node scripts/gen-touchicon-template.mjs
// then paste the printed string into TOUCHICON_ALPHA_B64.

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import zlib from "node:zlib";

const SIZE = 512;

// The logo, in white on a transparent background (the coloured background rect
// from public touch icons is intentionally omitted — it's applied at runtime).
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2481 2481" fill-rule="evenodd" clip-rule="evenodd" stroke-linejoin="round" stroke-miterlimit="2">
  <g transform="translate(372,596) scale(0.7)" fill="#ffffff">
    <g transform="matrix(1.003878,0,0,0.876822,668.314961,638.65748)">
      <path fill-opacity="0.4" d="M1472.133,0L1685.165,0C1751.304,0 1805,61.477 1805,137.2L1805,1234.8C1805,1310.523 1751.304,1372 1685.165,1372L119.835,1372C53.696,1372 0,1310.523 0,1234.8L0,1024.831L1352.298,1024.831C1418.437,1024.831 1472.133,963.354 1472.133,887.631L1472.133,0Z"/>
    </g>
    <g transform="matrix(1.003878,0,0,0.876822,334.15748,334.251969)">
      <path fill-opacity="0.7" d="M1472.133,0L1685.165,0C1751.304,0 1805,61.477 1805,137.2L1805,1234.8C1805,1310.523 1751.304,1372 1685.165,1372L119.835,1372C53.696,1372 0,1310.523 0,1234.8L0,990.792L1352.298,990.792C1418.437,990.792 1472.133,929.314 1472.133,853.592L1472.133,0Z"/>
    </g>
    <g transform="matrix(1.003878,0,0,0.876822,0,0)">
      <path d="M1805,137.2L1805,1234.8C1805,1310.523 1751.304,1372 1685.165,1372L119.835,1372C53.696,1372 0,1310.523 0,1234.8L0,137.2C0,61.477 53.696,0 119.835,0L1685.165,0C1751.304,0 1805,61.477 1805,137.2Z"/>
    </g>
  </g>
</svg>`;

const dir = mkdtempSync(join(tmpdir(), "touchicon-"));
const svgPath = join(dir, "logo.svg");
const rgbaPath = join(dir, "logo.rgba");
writeFileSync(svgPath, LOGO_SVG);

execFileSync("magick", [
  "-background", "none", "-density", "300",
  svgPath, "-resize", `${SIZE}x${SIZE}`, "-depth", "8", `RGBA:${rgbaPath}`,
]);

const rgba = readFileSync(rgbaPath);
if (rgba.length !== SIZE * SIZE * 4) {
  throw new Error(`unexpected raw size ${rgba.length}, expected ${SIZE * SIZE * 4}`);
}

// The logo is pure white, so only the alpha channel carries information.
const alpha = Buffer.alloc(SIZE * SIZE);
for (let p = 0; p < SIZE * SIZE; p++) alpha[p] = rgba[p * 4 + 3];

const b64 = zlib.deflateSync(alpha, { level: 9 }).toString("base64");
console.log(`\nTOUCHICON_ALPHA_B64 (${b64.length} chars) — paste into server/utils/touchicon.ts:\n`);
console.log(b64);
