import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("pino", () => {
  const mockPinoInstance = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
  return { default: vi.fn(() => mockPinoInstance) };
});

import pino from "pino";

import { logMessage } from "./logger";

const mockPinoInstance = pino() as unknown as {
  debug: ReturnType<typeof vi.fn>;
  info: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("logMessage.debug", () => {
  it("logs a string message", () => {
    logMessage.debug("debug message");
    expect(mockPinoInstance.debug).toHaveBeenCalledWith("debug message");
  });

  it("logs a Record object", () => {
    logMessage.debug({ userId: "123", action: "login" });
    expect(mockPinoInstance.debug).toHaveBeenCalledWith({ userId: "123", action: "login" });
  });
});

describe("logMessage.info", () => {
  it("logs a string message", () => {
    logMessage.info("info message");
    expect(mockPinoInstance.info).toHaveBeenCalledWith("info message");
  });
});

describe("logMessage.warn", () => {
  it("logs a string message", () => {
    logMessage.warn("warn message");
    expect(mockPinoInstance.warn).toHaveBeenCalledWith("warn message");
  });
});

describe("logMessage.error", () => {
  it("logs message string alone when no cause provided", () => {
    logMessage.error("Could not load session");
    expect(mockPinoInstance.error).toHaveBeenCalledWith("Could not load session");
  });

  it("logs an Error cause with err serialization and message as msg", () => {
    const error = new Error("something went wrong");
    logMessage.error("Failed to get user abc123", error);
    expect(mockPinoInstance.error).toHaveBeenCalledWith(
      { err: error },
      "Failed to get user abc123"
    );
  });

  it("preserves stack trace via the err object", () => {
    const error = new Error("oops");
    logMessage.error("Operation failed", error);
    const call = mockPinoInstance.error.mock.calls[0];
    expect(call[0]).toEqual({ err: error });
    expect(call[0].err.stack).toContain("oops");
  });

  it("appends a string cause to message", () => {
    logMessage.error("Could not load session", "connection refused");
    expect(mockPinoInstance.error).toHaveBeenCalledWith(
      "Could not load session: connection refused"
    );
  });

  it("serializes an unknown object cause as JSON appended to message", () => {
    const obj = { code: 404, detail: "not found" };
    logMessage.error("Upstream error", obj);
    expect(mockPinoInstance.error).toHaveBeenCalledWith(`Upstream error: ${JSON.stringify(obj)}`);
  });

  it("falls back gracefully when JSON.stringify throws on cause", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    logMessage.error("Serialization failed", circular);
    const call = mockPinoInstance.error.mock.calls[0][0] as string;
    expect(call).toContain("Failed to serialize error payload");
    expect(call).toContain("[Object]");
    expect(call).toContain("[object Object]");
  });

  it("logs Error subclass instances with the err object", () => {
    class CustomError extends Error {
      code = 7;
    }
    const error = new CustomError("connect error");
    logMessage.error("Failed to connect", error);
    expect(mockPinoInstance.error).toHaveBeenCalledWith({ err: error }, "Failed to connect");
  });
});
