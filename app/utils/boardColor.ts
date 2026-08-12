// A board tile can carry a colour instead of a cover image. The colour is
// stored as a `#rrggbb` string and is the tile's background, so everything
// drawn on top of it — the name chip, the badge, the unread dot, the avatar
// rings — has to stay readable against whatever the user picked, including
// pale yellows and near-blacks. That is what `boardTextColor` is for.
//
// Shared by the client (the picker and the tile) and the server (validating
// what gets stored), so a colour can never be accepted in one place and
// rejected in the other.

// Twelve presets covering the hue circle. Every one clears 4.5:1 against white
// — the brighter oranges, greens and teals of the usual palette do not, so the
// darker step of each was taken — which means the common case is one click and
// the tile always reads the same way. The custom picker beside them takes any
// colour, and `boardTextColor` keeps that readable too.
export const BOARD_COLORS = [
  "#3f3f46",
  "#2563eb",
  "#4f46e5",
  "#7c3aed",
  "#a21caf",
  "#e11d48",
  "#dc2626",
  "#c2410c",
  "#b45309",
  "#15803d",
  "#0f766e",
  "#0e7490",
];

// White, and the app's own `--color-dark` — the two candidates for anything
// drawn on a board colour.
export const BOARD_TEXT_LIGHT = "#ffffff";
export const BOARD_TEXT_DARK = "#1c1c1e";

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * Parse a user- or API-supplied colour into the stored `#rrggbb` form.
 * Returns null for anything unusable (empty, malformed, not a string), which
 * is also how "no colour, use the default tile" is represented.
 */
export function normalizeBoardColor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = value.trim().match(HEX);
  if (!match) return null;
  const digits = match[1].toLowerCase();
  // `#abc` is the same colour as `#aabbcc`; store the long form only.
  const full =
    digits.length === 3
      ? digits
          .split("")
          .map((c) => c + c)
          .join("")
      : digits;
  return `#${full}`;
}

// WCAG relative luminance. The channel curve is the sRGB transfer function, not
// a plain average — #0000ff and #ffff00 have wildly different brightness at the
// same "average" value, and only this gets that right.
const channel = (value: number): number =>
  value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);

export function relativeLuminance(color: string): number {
  const hex = normalizeBoardColor(color) ?? "#000000";
  const r = channel(parseInt(hex.slice(1, 3), 16) / 255);
  const g = channel(parseInt(hex.slice(3, 5), 16) / 255);
  const b = channel(parseInt(hex.slice(5, 7), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const contrastRatio = (a: number, b: number): number => {
  const [light, dark] = a > b ? [a, b] : [b, a];
  return (light + 0.05) / (dark + 0.05);
};

/**
 * The better of white and near-black to draw on top of `color` — whichever
 * gives the higher contrast ratio. Comparing measured ratios rather than
 * thresholding the luminance means the awkward middle greens and oranges get
 * the readable answer instead of a guess.
 */
export function boardTextColor(color: string): string {
  const background = relativeLuminance(color);
  const onLight = contrastRatio(background, relativeLuminance(BOARD_TEXT_LIGHT));
  const onDark = contrastRatio(background, relativeLuminance(BOARD_TEXT_DARK));
  return onLight >= onDark ? BOARD_TEXT_LIGHT : BOARD_TEXT_DARK;
}
