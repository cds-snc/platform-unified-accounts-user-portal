import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import "server-only";

type ResetSession = { sessionId: string; sessionToken: string };

export const createResetKey = () => randomBytes(32).toString("base64url");

// The session token is encrypted with a key that only exists in the requesting browser's cookie.
export function sealResetSession(session: ResetSession, key: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(key, "base64url"), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(session)), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64url");
}

export function openResetSession(sealed: string, key: string): ResetSession | undefined {
  try {
    const buffer = Buffer.from(sealed, "base64url");
    const decipher = createDecipheriv(
      "aes-256-gcm",
      Buffer.from(key, "base64url"),
      buffer.subarray(0, 12)
    );
    decipher.setAuthTag(buffer.subarray(12, 28));
    const data = Buffer.concat([decipher.update(buffer.subarray(28)), decipher.final()]);
    return JSON.parse(data.toString());
  } catch {
    return undefined;
  }
}
