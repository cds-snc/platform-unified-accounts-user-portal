import { createHmac, hkdfSync, timingSafeEqual } from "node:crypto";

import { logMessage } from "@lib/logger";

import "server-only";

const SIGNATURE_VERSION = "v1";

export function getSigningSecrets(secretEnvVar: string, minSecretLength: number): string[] {
  const secrets = (process.env[secretEnvVar] ?? "")
    .split(",")
    .map((secret) => secret.trim())
    .filter(Boolean);

  if (secrets.some((secret) => secret.length < minSecretLength)) {
    logMessage.error(
      `${secretEnvVar} is invalid: every value must be at least ${minSecretLength} characters long`
    );
    return [];
  }

  return Array.from(new Set(secrets));
}

export function createSigner(secretEnvVar: string, purpose: string, minSecretLength: number) {
  const info = `${purpose}-${SIGNATURE_VERSION}`;
  const signingKeyCache = new Map<string, Buffer>();

  const getSecrets = () => getSigningSecrets(secretEnvVar, minSecretLength);

  function computeSignature(value: unknown, secret: string): string {
    const cacheKey = JSON.stringify([info, secret]);
    let key = signingKeyCache.get(cacheKey);
    if (!key) {
      key = Buffer.from(hkdfSync("sha256", secret, "", info, 32));
      signingKeyCache.set(cacheKey, key);
    }
    return createHmac("sha256", key)
      .update(JSON.stringify([SIGNATURE_VERSION, value]))
      .digest("base64url");
  }

  function sign(value: unknown): string {
    const [secret] = getSecrets();
    if (!secret) {
      throw new Error(
        `Signing secret is not configured. Set ${secretEnvVar} (at least ${minSecretLength} characters).`
      );
    }
    return computeSignature(value, secret);
  }

  function verify(value: unknown, signature: string): boolean {
    const signatureBytes = Buffer.from(signature);
    let valid = false;
    // Check every secret so timing does not reveal which rotation key matched.
    for (const secret of getSecrets()) {
      const expected = Buffer.from(computeSignature(value, secret));
      if (signatureBytes.length === expected.length && timingSafeEqual(signatureBytes, expected)) {
        valid = true;
      }
    }
    return valid;
  }

  return { getSecrets, sign, verify };
}
