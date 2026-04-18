/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import pino from "pino";
const pinoLogger = pino({
  level: process.env.NODE_ENV === "development" ? "debug" : "info",
  browser: {
    asObject: true,
    serialize: true,
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
  ...(process.env.NODE_ENV === "development" && {
    transport: {
      target: "pino-pretty",
    },
  }),

  base: null,
});

/**
 * Type-safe logger for the app.
 * Messages should be strings or serialized objects (for debug).
 * Errors can accept any value from catch blocks (unknown) and handles them appropriately.
 */
export type AppLogger = {
  debug(message: string | Record<string, unknown>): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string, cause?: unknown): void;
};

/**
 * App logger instance.
 * @example
 * // ✅ Correct - message only
 * logMessage.error("Could not load session");
 *
 * // ✅ Correct - message + Error cause (preserves stack trace)
 * logMessage.error("Failed to get user", error);
 *
 * // ✅ Correct - message + unknown from catch blocks
 * logMessage.error("Failed to get user", e);
 *
 * // ✅ Correct - serialized object with debug
 * logMessage.debug({ userId: 123, action: "login" });
 *
 * // ❌ Incorrect - objects not allowed for info/warn
 * logMessage.info({ user }); // Type error
 * logMessage.warn({ user }); // Type error
 */
export const logMessage: AppLogger = {
  debug: (message: string | Record<string, unknown>) => {
    try {
      pinoLogger.debug(message);
    } catch {
      try {
        pinoLogger.debug(JSON.stringify(message));
      } catch {
        pinoLogger.debug("Failed to serialize debug log payload");
      }
    }
  },
  info: (message: string) => pinoLogger.info(message),
  warn: (message: string) => pinoLogger.warn(message),
  error: (message: string, cause?: unknown) => {
    try {
      if (cause instanceof Error) {
        pinoLogger.error({ err: cause }, message);
      } else if (cause !== undefined) {
        const serialized = typeof cause === "string" ? cause : JSON.stringify(cause);
        pinoLogger.error(`${message}: ${serialized}`);
      } else {
        pinoLogger.error(message);
      }
    } catch {
      const typeName = cause?.constructor?.name ?? typeof cause;
      pinoLogger.error(
        `Failed to serialize error payload: ${message}: [${typeName}]: ${String(cause)}`
      );
    }
  },
};
