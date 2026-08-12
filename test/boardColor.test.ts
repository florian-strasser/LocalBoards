import { describe, it, expect } from "vitest";
import {
  BOARD_COLORS,
  BOARD_TEXT_DARK,
  BOARD_TEXT_LIGHT,
  boardTextColor,
  normalizeBoardColor,
  relativeLuminance,
} from "../app/utils/boardColor";

describe("normalizeBoardColor", () => {
  it("accepts the stored form unchanged", () => {
    expect(normalizeBoardColor("#2563eb")).toBe("#2563eb");
  });

  it("lowercases, trims and expands the short form", () => {
    expect(normalizeBoardColor("#2563EB")).toBe("#2563eb");
    expect(normalizeBoardColor("  #2563eb  ")).toBe("#2563eb");
    expect(normalizeBoardColor("#ABC")).toBe("#aabbcc");
  });

  it("accepts a missing leading hash", () => {
    expect(normalizeBoardColor("2563eb")).toBe("#2563eb");
  });

  it("rejects anything that is not a hex colour", () => {
    for (const value of [
      "",
      "   ",
      "red",
      "#12345",
      "#1234567",
      "#gggggg",
      "rgb(1,2,3)",
      // A colour is written straight into a CSS custom property, so anything
      // that could carry other declarations has to be refused here.
      "#fff; background-image: url(x)",
      "javascript:alert(1)",
    ]) {
      expect(normalizeBoardColor(value)).toBeNull();
    }
  });

  it("rejects non-strings", () => {
    for (const value of [null, undefined, 123, {}, [], true]) {
      expect(normalizeBoardColor(value)).toBeNull();
    }
  });
});

describe("boardTextColor", () => {
  it("puts white on dark colours and near-black on light ones", () => {
    expect(boardTextColor("#000000")).toBe(BOARD_TEXT_LIGHT);
    expect(boardTextColor("#1c1c1e")).toBe(BOARD_TEXT_LIGHT);
    expect(boardTextColor("#ffffff")).toBe(BOARD_TEXT_DARK);
    expect(boardTextColor("#ffff00")).toBe(BOARD_TEXT_DARK);
  });

  it("weights the channels rather than averaging them", () => {
    // Same "average" brightness, opposite readable foregrounds: green carries
    // most of the perceived luminance, blue almost none.
    expect(boardTextColor("#00ff00")).toBe(BOARD_TEXT_DARK);
    expect(boardTextColor("#0000ff")).toBe(BOARD_TEXT_LIGHT);
  });

  it("gives every preset white text at WCAG AA contrast", () => {
    // The palette is chosen so a preset never needs the dark foreground. This
    // pins the actual ratio down, so swapping in a brighter shade later fails
    // here instead of shipping a tile that is hard to read.
    const white = relativeLuminance(BOARD_TEXT_LIGHT);
    for (const color of BOARD_COLORS) {
      const background = relativeLuminance(color);
      const ratio = (white + 0.05) / (background + 0.05);
      expect({ color, aa: ratio >= 4.5 }).toEqual({ color, aa: true });
      expect(boardTextColor(color)).toBe(BOARD_TEXT_LIGHT);
    }
  });

  it("falls back to a readable answer for an invalid colour", () => {
    expect(boardTextColor("nonsense")).toBe(BOARD_TEXT_LIGHT);
  });
});
