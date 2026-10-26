import { UserState } from "@zitadel/proto/zitadel/user/v2/user_pb";
import { AuthenticationMethodType } from "@zitadel/proto/zitadel/user/v2/user_service_pb";
import { createHmac, timingSafeEqual } from "node:crypto";
import * as v from "valibot";

import { logMessage } from "@lib/logger";
import { resetPasswordLinkSchema } from "@lib/validation/validationSchemas";
import { getUserByID, listAuthenticationMethodTypes } from "@lib/zitadel";

import "server-only";

export const PASSWORD_RESET_TTL_SECONDS = 15 * 60;

type ResetLink = v.InferOutput<typeof resetPasswordLinkSchema>;
type PasswordChanged = { seconds: bigint | string | number; nanos: number } | undefined;

function getResetSecret(): string {
  const secret = process.env.PASSWORD_RESET_SECRET;
  if (!secret) {
    throw new Error("Missing PASSWORD_RESET_SECRET environment variable");
  }
  return secret;
}

function signatureInput({ userId, expiry }: ResetLink, passwordChanged: PasswordChanged): string {
  return JSON.stringify({
    userId,
    expiry,
    // Zitadel timestamps may have bigint, number or serialized string seconds.
    passwordChanged: passwordChanged
      ? { seconds: String(passwordChanged.seconds), nanos: passwordChanged.nanos }
      : null,
  });
}

export function signResetLink({
  userId,
  passwordChanged,
}: {
  userId: string;
  passwordChanged: PasswordChanged;
}): string {
  const payload: ResetLink = {
    userId,
    expiry: Math.floor(Date.now() / 1000) + PASSWORD_RESET_TTL_SECONDS,
  };
  const signature = createHmac("sha256", getResetSecret())
    .update(signatureInput(payload, passwordChanged))
    .digest("base64url");
  return `${Buffer.from(JSON.stringify(payload)).toString("base64url")}.${signature}`;
}

export async function verifyResetLink(token: string): Promise<ResetLink | undefined> {
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

    const { authMethodTypes = [] } = await listAuthenticationMethodTypes(user.userId);
    if (
      !authMethodTypes.includes(AuthenticationMethodType.TOTP) &&
      !authMethodTypes.includes(AuthenticationMethodType.U2F)
    ) {
      throw new Error("Password reset link user has no strong MFA method");
    }

    if (!/^[A-Za-z0-9_-]{43}$/.test(encodedSignature)) {
      throw new Error("Invalid password reset link signature format");
    }
    const signature = Buffer.from(encodedSignature, "base64url");
    if (signature.toString("base64url") !== encodedSignature) {
      throw new Error("Invalid password reset link signature encoding");
    }
    const input = signatureInput(resetLink, user.type.value.passwordChanged);
    const expectedSignature = createHmac("sha256", getResetSecret()).update(input).digest();
    if (!timingSafeEqual(signature, expectedSignature)) {
      throw new Error("Password reset link signature did not match");
    }

    return resetLink;
  } catch (error) {
    logMessage.warn("Failed to verify password reset link", { error });
    return undefined;
  }
}
