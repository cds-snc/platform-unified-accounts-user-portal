import { UserState } from "@zitadel/proto/zitadel/user/v2/user_pb";
import { AuthenticationMethodType } from "@zitadel/proto/zitadel/user/v2/user_service_pb";
import * as v from "valibot";

import { logMessage } from "@lib/logger";
import { createSigner } from "@lib/signing";
import { resetPasswordLinkSchema } from "@lib/validation/validationSchemas";
import { getUserByID, listAuthenticationMethodTypes } from "@lib/zitadel";

import "server-only";

const RESET_LINK_TTL_SECONDS = 15 * 60;
const resetLinkSigner = createSigner("PASSWORD_RESET_SECRET", "password-reset-link", 32);

type ResetLinkPayload = v.InferOutput<typeof resetPasswordLinkSchema>;
type PasswordChanged = { seconds: bigint | string | number; nanos: number } | undefined;

function normalizeTimestamp(changedAt: PasswordChanged): string {
  // Zitadel timestamps may have bigint, number or serialized string seconds.
  return changedAt ? `${Number(changedAt.seconds)}.${Number(changedAt.nanos)}` : "none";
}

export function signResetLink({
  userId,
  passwordChanged,
  requestId,
}: {
  userId: string;
  passwordChanged: PasswordChanged;
  requestId?: string;
}): string {
  const payload: ResetLinkPayload = {
    userId,
    expiry: Math.floor(Date.now() / 1000) + RESET_LINK_TTL_SECONDS,
    passwordChanged: normalizeTimestamp(passwordChanged),
    ...(requestId
      ? { requestId: v.parse(resetPasswordLinkSchema.entries.requestId, requestId) }
      : {}),
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = resetLinkSigner.sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export async function verifyResetLink(token: string): Promise<ResetLinkPayload | undefined> {
  try {
    const [encodedPayload, encodedSignature, extra] = token.split(".");
    if (
      !encodedPayload ||
      !encodedSignature ||
      extra !== undefined ||
      !/^[A-Za-z0-9_-]+$/.test(encodedPayload)
    ) {
      throw new Error("Invalid password reset link format");
    }

    if (!/^[A-Za-z0-9_-]{43}$/.test(encodedSignature)) {
      throw new Error("Invalid password reset link signature format");
    }
    const signature = Buffer.from(encodedSignature, "base64url");
    if (signature.toString("base64url") !== encodedSignature) {
      throw new Error("Invalid password reset link signature encoding");
    }
    if (!resetLinkSigner.verify(encodedPayload, encodedSignature)) {
      throw new Error("Password reset link signature did not match");
    }

    const resetLink = v.parse(
      resetPasswordLinkSchema,
      JSON.parse(Buffer.from(encodedPayload, "base64url").toString())
    );
    if (resetLink.expiry <= Math.floor(Date.now() / 1000)) {
      throw new Error("Invalid or expired password reset link expiry");
    }

    const { user } = await getUserByID(resetLink.userId);
    if (
      !user ||
      user.userId !== resetLink.userId ||
      user.type.case !== "human" ||
      user.state !== UserState.ACTIVE
    ) {
      throw new Error("Password reset link user is not an active human");
    }

    if (normalizeTimestamp(user.type.value.passwordChanged) !== resetLink.passwordChanged) {
      throw new Error("Password reset link was issued before the latest password change");
    }

    const { authMethodTypes = [] } = await listAuthenticationMethodTypes(user.userId);
    if (
      !authMethodTypes.includes(AuthenticationMethodType.TOTP) &&
      !authMethodTypes.includes(AuthenticationMethodType.U2F)
    ) {
      throw new Error("Password reset link user has no strong MFA method");
    }

    return resetLink;
  } catch (error) {
    logMessage.warn("Failed to verify password reset link", { error });
    return undefined;
  }
}
