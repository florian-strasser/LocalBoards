import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger } from "./logger";

let logSpy: ReturnType<typeof vi.spyOn>;
let errSpy: ReturnType<typeof vi.spyOn>;
const savedLevel = process.env.NUXT_LOG_LEVEL;

beforeEach(() => {
  logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  logSpy.mockRestore();
  errSpy.mockRestore();
  if (savedLevel === undefined) delete process.env.NUXT_LOG_LEVEL;
  else process.env.NUXT_LOG_LEVEL = savedLevel;
});

describe("logger", () => {
  it("emits a JSON line with level, time and message", () => {
    process.env.NUXT_LOG_LEVEL = "info";
    logger.info("hello");
    expect(logSpy).toHaveBeenCalledTimes(1);
    const entry = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(entry).toMatchObject({ level: "info", msg: "hello" });
    expect(typeof entry.time).toBe("string");
  });

  it("serializes an Error context into name/message/stack", () => {
    process.env.NUXT_LOG_LEVEL = "info";
    logger.error("boom", new Error("kaboom"));
    const entry = JSON.parse(errSpy.mock.calls[0][0] as string);
    expect(entry).toMatchObject({
      level: "error",
      msg: "boom",
      error: { name: "Error", message: "kaboom" },
    });
    expect(typeof entry.error.stack).toBe("string");
  });

  it("attaches non-error context under `context`", () => {
    process.env.NUXT_LOG_LEVEL = "info";
    logger.info("with ctx", { boardId: 7 });
    const entry = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(entry.context).toEqual({ boardId: 7 });
  });

  it("suppresses messages below the configured level", () => {
    process.env.NUXT_LOG_LEVEL = "warn";
    logger.info("should be hidden");
    logger.debug("also hidden");
    expect(logSpy).not.toHaveBeenCalled();

    logger.warn("shown");
    logger.error("shown too");
    expect(errSpy).toHaveBeenCalledTimes(2);
  });

  it("routes warn/error to stderr and info/debug to stdout", () => {
    process.env.NUXT_LOG_LEVEL = "debug";
    logger.debug("d");
    logger.info("i");
    logger.warn("w");
    logger.error("e");
    expect(logSpy).toHaveBeenCalledTimes(2); // debug + info
    expect(errSpy).toHaveBeenCalledTimes(2); // warn + error
  });
});
