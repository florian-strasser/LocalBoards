// Tiny zero-dependency structured logger.
//
// Emits one JSON object per line (timestamp, level, message, optional context /
// serialized error) to stdout/stderr, which plays well with Docker log drivers
// and log aggregators. The minimum level is controlled by NUXT_LOG_LEVEL (or
// LOG_LEVEL), defaulting to "info" — so "debug" traces are silent in production
// unless explicitly enabled.

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVELS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function threshold(): number {
  const raw = (
    process.env.NUXT_LOG_LEVEL ||
    process.env.LOG_LEVEL ||
    "info"
  ).toLowerCase();
  return LEVELS[raw as LogLevel] ?? LEVELS.info;
}

function serializeContext(context: unknown): Record<string, unknown> {
  if (context === undefined) return {};
  if (context instanceof Error) {
    return {
      error: {
        name: context.name,
        message: context.message,
        stack: context.stack,
      },
    };
  }
  return { context };
}

export function logAt(level: LogLevel, message: string, context?: unknown) {
  if (LEVELS[level] < threshold()) return;
  const entry = {
    level,
    time: new Date().toISOString(),
    msg: message,
    ...serializeContext(context),
  };
  const line = JSON.stringify(entry);
  // Warnings and errors go to stderr; everything else to stdout.
  if (level === "warn" || level === "error") {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (message: string, context?: unknown) => logAt("debug", message, context),
  info: (message: string, context?: unknown) => logAt("info", message, context),
  warn: (message: string, context?: unknown) => logAt("warn", message, context),
  error: (message: string, context?: unknown) => logAt("error", message, context),
};
