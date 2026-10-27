import { UserState } from "@zitadel/proto/zitadel/user/v2/user_pb";
import { AuthenticationMethodType } from "@zitadel/proto/zitadel/user/v2/user_service_pb";
import { createHmac, timingSafeEqual } from "node:crypto";
import * as v from "valibot";

import { logMessage } from "@lib/logger";
import { resetPasswordLinkSchema } from "@lib/validation/validationSchemas";
import { getUserByID, listAuthenticationMethodTypes } from "@lib/zitadel";

import "server-only";

export const RESET_LINK_TTL_SECONDS = 15 * 60;

type ResetLinkPayload = v.InferOutput<typeof resetPasswordLinkSchema>;
type PasswordChanged = { seconds: bigint | string | number; nanos: number } | undefined;

function getResetSecret(): string {
  const secret = process.env.PASSWORD_RESET_SECRET;
  if (!secret) {
    throw new Error("Missing PASSWORD_RESET_SECRET environment variable");
  }
  return secret;
}

function hmac(value: string): Buffer {
  return createHmac("sha256", getResetSecret()).update(value).digest();
}

function timestampFingerprint(changedAt: PasswordChanged): string {
  // Zitadel timestamps may have bigint, number or serialized string seconds.
  const normalized = changedAt ? `${Number(changedAt.seconds)}.${Number(changedAt.nanos)}` : "none";
  return hmac(normalized).toString("base64url");
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
    passwordChanged: timestampFingerprint(passwordChanged),
    ...(requestId
      ? { requestId: v.parse(resetPasswordLinkSchema.entries.requestId, requestId) }
      : {}),
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = hmac(encodedPayload).toString("base64url");
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
    if (!timingSafeEqual(signature, hmac(encodedPayload))) {
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

    if (timestampFingerprint(user.type.value.passwordChanged) !== resetLink.passwordChanged) {
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
