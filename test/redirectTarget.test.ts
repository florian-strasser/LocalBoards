import { describe, it, expect } from "vitest";
import { safeRedirect } from "../app/utils/redirectTarget";

describe("safeRedirect", () => {
  it("keeps a path on this instance", () => {
    expect(safeRedirect("/board/12")).toBe("/board/12");
  });

  it("keeps the query, which is often the point of the link", () => {
    expect(safeRedirect("/board/12?card=345")).toBe("/board/12?card=345");
  });

  it("falls back when there is nothing to go back to", () => {
    expect(safeRedirect(undefined)).toBe("/dashboard/");
    expect(safeRedirect("")).toBe("/dashboard/");
    expect(safeRedirect(null)).toBe("/dashboard/");
    expect(safeRedirect(["/board/12"])).toBe("/dashboard/");
  });

  // The reason this function exists: a login page that forwards anywhere is a
  // phishing link that genuinely starts on this instance's own domain.
  it("refuses another origin", () => {
    expect(safeRedirect("https://example.com/")).toBe("/dashboard/");
    expect(safeRedirect("http://example.com/")).toBe("/dashboard/");
    expect(safeRedirect("javascript:alert(1)")).toBe("/dashboard/");
    expect(safeRedirect("data:text/html,hi")).toBe("/dashboard/");
  });

  it("refuses the protocol-relative forms a browser reads as another host", () => {
    expect(safeRedirect("//example.com")).toBe("/dashboard/");
    expect(safeRedirect("//example.com/board/12")).toBe("/dashboard/");
    expect(safeRedirect("/\\example.com")).toBe("/dashboard/");
    expect(safeRedirect("///example.com")).toBe("/dashboard/");
  });

  it("refuses anything that is not a path at all", () => {
    expect(safeRedirect("board/12")).toBe("/dashboard/");
    expect(safeRedirect(" ")).toBe("/dashboard/");
  });

  it("does not send anyone back to the way in", () => {
    expect(safeRedirect("/")).toBe("/dashboard/");
    expect(safeRedirect("/sign-up")).toBe("/dashboard/");
    expect(safeRedirect("/lost-password")).toBe("/dashboard/");
    expect(safeRedirect("/reset-password/2b1c")).toBe("/dashboard/");
  });

  it("is not fooled by a trailing slash on the way in", () => {
    expect(safeRedirect("/sign-up/")).toBe("/dashboard/");
  });

  it("does not mistake a real page for the way in", () => {
    expect(safeRedirect("/sign-up-guide")).toBe("/sign-up-guide");
    expect(safeRedirect("/dashboard/")).toBe("/dashboard/");
  });

  it("takes the caller's fallback when one is given", () => {
    expect(safeRedirect("https://example.com", "/board/1")).toBe("/board/1");
  });
});
