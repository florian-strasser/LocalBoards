import { renderTouchiconPng } from "../utils/touchicon";

// Served dynamically (instead of a static public/ file) so the touch icon /
// PNG-favicon fallback matches the instance's configured primary colour at
// runtime. See server/utils/touchicon.ts for how it's rendered without a
// native rasterizer. The light-mode primary colour is used as the background
// (iOS ignores prefers-color-scheme for home-screen icons).
export default defineEventHandler((event) => {
  const { colorPrimary } = useRuntimeConfig(event).public;
  const png = renderTouchiconPng(colorPrimary);

  setHeader(event, "content-type", "image/png");
  setHeader(event, "cache-control", "public, max-age=3600");
  return png;
});
