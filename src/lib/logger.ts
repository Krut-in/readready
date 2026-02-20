// Server-side only structured logger. Do not import in "use client" modules.
//
// In all environments output is JSON so Vercel's log aggregation can parse it.
// Each log call is wrapped in a try/catch so a logging failure can never
// propagate as an unhandled exception.

type LogLevel = "info" | "warn" | "error";

type LogEntry = {
  timestamp: string;
  level: LogLevel;
  message: string;
  [key: string]: unknown;
};

function emit(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  try {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context ?? {}),
    };
    const text = JSON.stringify(entry);
    if (level === "error") {
      console.error(text);
    } else if (level === "warn") {
      console.warn(text);
    } else {
      console.log(text);
    }
  } catch {
    // Never let the logger crash the request handler.
  }
}

export const logger = {
  info:  (message: string, context?: Record<string, unknown>) => emit("info",  message, context),
  warn:  (message: string, context?: Record<string, unknown>) => emit("warn",  message, context),
  error: (message: string, context?: Record<string, unknown>) => emit("error", message, context),
};
