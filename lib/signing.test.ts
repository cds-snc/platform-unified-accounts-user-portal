// @vitest-environment node
import { createHmac, hkdfSync } from "node:crypto";
import { afterEach, expect, test, vi } from "vitest";

import { createSigner, getSigningSecrets } from "./signing";

vi.mock("@lib/logger", () => ({ logMessage: { error: vi.fn() } }));

afterEach(() => vi.unstubAllEnvs());

test("preserves cookie signatures and isolates signing purposes", () => {
  const secret = "a".repeat(32);
  vi.stubEnv("TEST_SIGNING_SECRET", secret);
  const signer = createSigner("TEST_SIGNING_SECRET", "session-cookie", 32);
  const value = [{ id: "session-1" }];
  const expected = createHmac(
    "sha256",
    Buffer.from(hkdfSync("sha256", secret, "", "session-cookie-v1", 32))
  )
    .update(JSON.stringify(["v1", value]))
    .digest("base64url");

  expect(signer.sign(value)).toBe(expected);
  expect(signer.verify(value, expected)).toBe(true);
  expect(signer.verify([{ id: "tampered" }], expected)).toBe(false);
  expect(signer.verify(value, "short")).toBe(false);
  expect(createSigner("TEST_SIGNING_SECRET", "other-purpose", 32).verify(value, expected)).toBe(
    false
  );
});

test("rotates, trims and deduplicates secrets, rejecting any invalid configuration", () => {
  const oldSecret = "a".repeat(32);
  const newSecret = "b".repeat(32);
  const signer = createSigner("TEST_SIGNING_SECRET", "test", 32);
  vi.stubEnv("TEST_SIGNING_SECRET", oldSecret);
  const oldSignature = signer.sign("value");
  vi.stubEnv("TEST_SIGNING_SECRET", ` ${newSecret}, ${oldSecret}, ${newSecret}, `);
  expect(signer.getSecrets()).toEqual([newSecret, oldSecret]);
  expect(signer.verify("value", oldSignature)).toBe(true);
  const newSignature = signer.sign("value");
  vi.stubEnv("TEST_SIGNING_SECRET", newSecret);
  expect(signer.verify("value", newSignature)).toBe(true);
  expect(signer.verify("value", oldSignature)).toBe(false);

  for (const invalid of [undefined, "", "a".repeat(31), `${oldSecret}, short`]) {
    vi.stubEnv("TEST_SIGNING_SECRET", invalid);
    expect(signer.getSecrets()).toEqual([]);
    expect(() => signer.sign("value")).toThrow("at least 32 characters");
    expect(signer.verify("value", newSignature)).toBe(false);
  }
});

test("enforces the configured minimum length when reading, signing and verifying", () => {
  for (const minSecretLength of [16, 64]) {
    const signer = createSigner("TEST_SIGNING_SECRET", "test", minSecretLength);
    const secret = "a".repeat(minSecretLength);
    vi.stubEnv("TEST_SIGNING_SECRET", secret);
    expect(getSigningSecrets("TEST_SIGNING_SECRET", minSecretLength)).toEqual([secret]);
    const signature = signer.sign("value");
    expect(signer.verify("value", signature)).toBe(true);

    vi.stubEnv("TEST_SIGNING_SECRET", "a".repeat(minSecretLength - 1));
    expect(getSigningSecrets("TEST_SIGNING_SECRET", minSecretLength)).toEqual([]);
    expect(() => signer.sign("value")).toThrow(`at least ${minSecretLength} characters`);
    expect(signer.verify("value", signature)).toBe(false);
  }
});
