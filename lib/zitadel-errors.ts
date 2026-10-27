import type { ConnectError } from "@connectrpc/connect";
import { ErrorDetailSchema } from "@zitadel/proto/zitadel/message_pb";

type ZitadelErrorContext = "otp.verify" | "otp.set";

export type ZitadelErrorKey =
  "set.invalidCode" | "set.invalidCodeLength" | "set.alreadySetUp" | "set.genericError";

type ZitadelUiError = {
  errorKey: ZitadelErrorKey;
  blockContinue?: boolean;
};

type ZitadelParsedError = {
  code?: number;
  text: string;
};

type ZitadelUiErrorRule = {
  match: (error: ZitadelParsedError) => boolean;
  errorKey: ZitadelErrorKey;
  blockContinue?: boolean;
};

type ZitadelErrorRulesByContext = Record<ZitadelErrorContext, ZitadelUiErrorRule[]>;

const defaultRulesByContext: ZitadelErrorRulesByContext = {
  "otp.verify": [
    {
      match: (error) =>
        error.text.includes("value length must be 6") || error.text.includes("6 runes"),
      errorKey: "set.invalidCodeLength",
    },
    {
      match: (error) =>
        error.code === 3 ||
        error.text.includes("invalid code") ||
        error.text.includes("invalid argument"),
      errorKey: "set.invalidCode",
    },
  ],
  "otp.set": [
    {
      match: (error) =>
        error.text.includes("value length must be 6") || error.text.includes("6 runes"),
      errorKey: "set.invalidCodeLength",
      blockContinue: true,
    },
    {
      match: (error) =>
        error.code === 3 ||
        error.text.includes("invalid code") ||
        error.text.includes("invalid argument") ||
        error.text.includes("otpinvalidcode"),
      errorKey: "set.invalidCode",
      blockContinue: true,
    },
    {
      match: (error) =>
        error.code === 6 ||
        error.text.includes("already set up") ||
        error.text.includes("already configured") ||
        error.text.includes("already ready") ||
        error.text.includes("otpalreadyready") ||
        error.text.includes("multifactor otp"),
      errorKey: "set.alreadySetUp",
    },
  ],
};

// Unrecognised errors resolve to these so raw upstream messages never reach the UI.
const fallbackErrors: Record<ZitadelErrorContext, ZitadelUiError> = {
  "otp.verify": { errorKey: "set.genericError" },
  "otp.set": { errorKey: "set.genericError", blockContinue: true },
};

type ConnectErrorLike = Pick<
  ConnectError,
  "code" | "message" | "rawMessage" | "metadata" | "findDetails"
>;

function isConnectErrorLike(err: unknown): err is ConnectErrorLike {
  if (!err || typeof err !== "object") {
    return false;
  }

  const candidate = err as { findDetails?: unknown };
  return typeof candidate.findDetails === "function";
}

function getFirstErrorDetail(err: { findDetails: (schema: unknown) => unknown[] }) {
  try {
    return err.findDetails(ErrorDetailSchema)[0];
  } catch {
    return undefined;
  }
}

function getErrorDetailFields(detail: unknown): { id?: string; message?: string } {
  if (!detail || typeof detail !== "object") {
    return {};
  }

  const candidate = detail as { id?: string; message?: string };
  return {
    id: candidate.id,
    message: candidate.message,
  };
}

export function parseZitadelError(err: {
  code?: unknown;
  message?: unknown;
  rawMessage?: unknown;
  metadata?: unknown;
}): ZitadelParsedError {
  const getHeader = (name: string): string | undefined => {
    if (!err.metadata || typeof err.metadata !== "object") {
      return undefined;
    }

    const metadata = err.metadata as { get?: (key: string) => string | null };
    if (typeof metadata.get !== "function") {
      return undefined;
    }

    try {
      return metadata.get(name) ?? undefined;
    } catch {
      return undefined;
    }
  };

  const headerStatus = getHeader("grpc-status");
  const parsedHeaderStatus =
    typeof headerStatus === "string" && /^\d+$/.test(headerStatus)
      ? Number(headerStatus)
      : undefined;

  const code = typeof err.code === "number" ? err.code : parsedHeaderStatus;
  const message = typeof err.message === "string" ? err.message : "";
  const rawMessage = typeof err.rawMessage === "string" ? err.rawMessage : "";
  const grpcMessage = getHeader("grpc-message") ?? "";

  const detail = isConnectErrorLike(err) ? getFirstErrorDetail(err) : undefined;
  const detailFields = getErrorDetailFields(detail);

  const detailText = detail ? `${detailFields.id ?? ""} ${detailFields.message ?? ""}` : "";

  const text = `${detailText} ${grpcMessage} ${rawMessage} ${message}`.toLowerCase();

  return {
    code,
    text,
  };
}

/**
 * Maps an error to a translation key the client can render. Always returns a result;
 * errors that are not objects or match no rule resolve to the context's fallback.
 */
export function getZitadelUiError(
  context: ZitadelErrorContext,
  err: unknown,
  rulesByContext: ZitadelErrorRulesByContext = defaultRulesByContext
): ZitadelUiError {
  const fallback = fallbackErrors[context];

  if (!err || typeof err !== "object") {
    return fallback;
  }

  const parsedError = parseZitadelError(err);
  const rule = rulesByContext[context].find((candidate) => candidate.match(parsedError));

  return rule ? { errorKey: rule.errorKey, blockContinue: rule.blockContinue } : fallback;
}
