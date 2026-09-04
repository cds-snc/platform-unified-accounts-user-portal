"use server";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { headers } from "next/headers";
import { userAgent } from "next/server";
import { create } from "@zitadel/client";
import { VerifyU2FRegistrationRequestSchema } from "@zitadel/proto/zitadel/user/v2/user_service_pb";

import { AuthenticatedAction } from "@lib/actions/authenticated";
/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getOriginalHost } from "@lib/server/host";
import { validateVerifyU2FCommand } from "@lib/validation/validationSchemas";
import { registerU2F, verifyU2FRegistration } from "@lib/zitadel";

import { U2F_ERRORS } from "../u2f-errors";

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

export const addU2F = AuthenticatedAction("any_mfa_required", async function addU2F(session) {
  const host = await getOriginalHost();

  const [hostname] = host.split(":");

  if (!hostname) {
    throw new Error("Could not get hostname");
  }

  const userId = session.factors.user.id;

  const result = await registerU2F({ userId, domain: hostname });

  const options = result.publicKeyCredentialCreationOptions;

  return {
    u2fId: result.u2fId,
    publicKeyCredentialCreationOptions: options,
    details: result.details,
  };
});

export const verifyU2F = AuthenticatedAction(
  "any_mfa_required",
  async function verifyU2F(session, command: VerifyU2FCommand) {
    const validationResult = validateVerifyU2FCommand(command);
    if (!validationResult.success) {
      return { error: U2F_ERRORS.SESSION_VERIFICATION_FAILED };
    }

    let passkeyName = command.passkeyName;

    if (!passkeyName) {
      const headersList = await headers();
      const userAgentStructure = { headers: headersList };
      const { browser, device, os } = userAgent(userAgentStructure);

      passkeyName = `${device.vendor ?? ""} ${device.model ?? ""}${
        device.vendor || device.model ? ", " : ""
      }${os.name}${os.name ? ", " : ""}${browser.name}`;
    }

    const userId = session.factors.user.id;

    const request = create(VerifyU2FRegistrationRequestSchema, {
      u2fId: command.u2fId,
      publicKeyCredential: command.publicKeyCredential,
      tokenName: passkeyName,
      userId,
    });

    const result = await verifyU2FRegistration({ request });

    // Check if the error is due to credential already being registered
    if ("error" in result && result.error) {
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
);
