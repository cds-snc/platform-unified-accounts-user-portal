"use server";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { headers } from "next/headers";
import { userAgent } from "next/server";
import { create } from "@zitadel/client";
import { VerifyU2FRegistrationRequestSchema } from "@zitadel/proto/zitadel/user/v2/user_service_pb";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getSessionCookieById } from "@lib/cookies";
import { getOriginalHost } from "@lib/server/host";
import { getSession, registerU2F, verifyU2FRegistration } from "@lib/zitadel";

import { U2F_ERRORS } from "../u2f-errors";

type RegisterU2FCommand = {
  sessionId: string;
};

type PublicKeyCredentialJSON = {
  id: string;
  rawId: string;
  type: string;
  response: {
    attestationObject: string;
    clientDataJSON: string;
  };
};

type VerifyU2FCommand = {
  u2fId: string;
  passkeyName?: string;
  publicKeyCredential: PublicKeyCredentialJSON;
  sessionId: string;
};

interface ProtobufMessage {
  toJson(): unknown;
}

function isProtobufMessage(obj: unknown): obj is ProtobufMessage {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "toJson" in obj &&
    typeof (obj as Record<string, unknown>).toJson === "function"
  );
}

export async function addU2F(command: RegisterU2FCommand) {
  const host = await getOriginalHost();

  const sessionCookie = await getSessionCookieById({
    sessionId: command.sessionId,
  });

  if (!sessionCookie) {
    return { error: U2F_ERRORS.SESSION_NOT_FOUND };
  }

  const session = await getSession(sessionCookie.id, sessionCookie.token);

  const [hostname] = host.split(":");

  if (!hostname) {
    throw new Error("Could not get hostname");
  }

  const userId = session?.session?.factors?.user?.id;

  if (!session || !userId) {
    return { error: U2F_ERRORS.SESSION_NOT_FOUND };
  }

  const result = await registerU2F({ userId, domain: hostname });

  // The publicKeyCredentialCreationOptions is a structpb.Struct
  // We need to use toJson() to get a plain object
  const options = result.publicKeyCredentialCreationOptions;
  let serializedOptions: unknown = null;

  if (isProtobufMessage(options)) {
    // Use protobuf's toJson() method
    serializedOptions = options.toJson();
  } else if (options) {
    // Fallback to JSON serialization
    serializedOptions = JSON.parse(JSON.stringify(options));
  }

  return {
    u2fId: result.u2fId,
    publicKeyCredentialCreationOptions: serializedOptions,
    details: result.details,
  };
}

export async function verifyU2F(command: VerifyU2FCommand) {
  let passkeyName = command.passkeyName;

  if (!passkeyName) {
    const headersList = await headers();
    const userAgentStructure = { headers: headersList };
    const { browser, device, os } = userAgent(userAgentStructure);

    passkeyName = `${device.vendor ?? ""} ${device.model ?? ""}${
      device.vendor || device.model ? ", " : ""
    }${os.name}${os.name ? ", " : ""}${browser.name}`;
  }

  const sessionCookie = await getSessionCookieById({
    sessionId: command.sessionId,
  });

  if (!sessionCookie) {
    return { error: U2F_ERRORS.SESSION_NOT_FOUND };
  }

  const session = await getSession(sessionCookie.id, sessionCookie.token);

  const userId = session?.session?.factors?.user?.id;

  if (!userId) {
    return { error: U2F_ERRORS.SESSION_NOT_FOUND };
  }

  const request = create(VerifyU2FRegistrationRequestSchema, {
    u2fId: command.u2fId,
    publicKeyCredential: command.publicKeyCredential,
    tokenName: passkeyName,
    userId,
  });

  const result = await verifyU2FRegistration({ request });

  // Check if the error is due to credential already being registered
  if (result && "error" in result && result.error) {
    const errorMessage = String(result.error).toLowerCase();
    if (
      errorMessage.includes("already") ||
      errorMessage.includes("duplicate") ||
      errorMessage.includes("exists")
    ) {
      return { error: U2F_ERRORS.CREDENTIAL_ALREADY_REGISTERED };
    }
  }

  return result;
}
