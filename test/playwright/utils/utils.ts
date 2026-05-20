import { createHmac, randomBytes } from "node:crypto";

export function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Expected ${name} to be set`);
  }

  return value;
}

export function getRandomEmail(email: string, aliasLength = 8): string {
  const atIndex = email.indexOf("@");

  if (atIndex <= 0 || atIndex === email.length - 1) {
    throw new Error("Expected an email address containing a local part and domain");
  }

  const randomAlias = randomBytes(aliasLength).toString("hex").slice(0, aliasLength);
  return `${email.slice(0, atIndex)}+${randomAlias}${email.slice(atIndex)}`;
}

export function getRandomPassword(length = 16): string {
  const randomPassword = randomBytes(length).toString("hex").slice(0, length);
  return `${randomPassword}aA1!`;
}

function base32Decode(encoded: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const sanitized = encoded.replace(/=+$/, "").toUpperCase().replace(/\s/g, "");
  const output: number[] = [];
  let bits = 0;
  let value = 0;

  for (let index = 0; index < sanitized.length; index += 1) {
    const alphabetIndex = alphabet.indexOf(sanitized[index]);

    if (alphabetIndex === -1) {
      continue;
    }

    value = (value << 5) | alphabetIndex;
    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(output);
}

function counterToBytes(counter: number): Buffer {
  const bytes = Buffer.alloc(8);
  const high = Math.floor(counter / 0x100000000);

  bytes.writeUInt32BE(high, 0);
  bytes.writeUInt32BE(counter >>> 0, 4);

  return bytes;
}

export function generateTOTP(base32Secret: string, timeStep = 30, digits = 6): string {
  const counter = Math.floor(Date.now() / 1000 / timeStep);
  const keyBytes = base32Decode(base32Secret);
  const hmac = createHmac("sha1", keyBytes).update(counterToBytes(counter)).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const truncated =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(truncated % 10 ** digits).padStart(digits, "0");
}
