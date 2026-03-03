import type { ConnectError } from "@connectrpc/connect";
import { ErrorDetailSchema } from "@zitadel/proto/zitadel/message_pb";

type ZitadelErrorContext = string;

type ZitadelUiError = {
  i18nKey: string;
  blockContinue?: boolean;
};

type ZitadelParsedError = {
  code?: number;
  text: string;
};

type ZitadelUiErrorRule = {
  match: (error: ZitadelParsedError) => boolean;
  i18nKey: string;
  blockContinue?: boolean;
};

type ZitadelErrorRulesByContext = Record<ZitadelErrorContext, ZitadelUiErrorRule[]>;

const defaultRulesByContext: ZitadelErrorRulesByContext = {
  "otp.verify": [
    {
      match: (error) =>
        error.text.includes("value length must be 6") || error.text.includes("6 runes"),
      i18nKey: "set.invalidCodeLength",
    },
    {
      match: (error) =>
        error.code === 3 ||
        error.text.includes("invalid code") ||
        error.text.includes("invalid argument"),
      i18nKey: "set.invalidCode",
    },
  ],
  "otp.set": [
    {
      match: (error) =>
        error.text.includes("value length must be 6") || error.text.includes("6 runes"),
      i18nKey: "set.invalidCodeLength",
      blockContinue: true,
    },
    {
      match: (error) =>
        error.code === 3 ||
        error.text.includes("invalid code") ||
        error.text.includes("invalid argument") ||
        error.text.includes("otpinvalidcode"),
      i18nKey: "set.invalidCode",
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
      i18nKey: "set.alreadySetUp",
    },
  ],
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

export function getZitadelUiError(
  context: ZitadelErrorContext,
  err: unknown,
  rulesByContext: ZitadelErrorRulesByContext = defaultRulesByContext
): ZitadelUiError | undefined {
  if (!err || typeof err !== "object") {
    return undefined;
  }

  try {
    const rules = rulesByContext[context] ?? [];
    const parsedError = parseZitadelError(
      err as {
        code?: unknown;
        message?: unknown;
        rawMessage?: unknown;
      }
    );

    for (const rule of rules) {
      try {
        if (rule.match(parsedError)) {
          return {
            i18nKey: rule.i18nKey,
            blockContinue: rule.blockContinue,
          };
        }
      } catch {
        continue;
      }
    }
  } catch {
    return undefined;
  }

  return undefined;
}
