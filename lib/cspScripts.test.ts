/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { NextResponse } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { generateCSP, responseWithCSP } from "./cspScripts";

describe("generateCSP", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns a unique nonce on each call", () => {
    const first = generateCSP();
    const second = generateCSP();

    expect(first.nonce).not.toBe(second.nonce);
  });

  describe("production mode (NODE_ENV !== 'development')", () => {
    it("includes nonce in script-src", () => {
      vi.stubEnv("NODE_ENV", "production");
      const { csp, nonce } = generateCSP();

      expect(csp).toContain(`script-src 'self' 'nonce-${nonce}' 'strict-dynamic';`);
    });

    it("includes nonce in style-src", () => {
      vi.stubEnv("NODE_ENV", "production");
      const { csp, nonce } = generateCSP();

      expect(csp).toContain(`style-src 'self' 'nonce-${nonce}';`);
    });

    it("does not include unsafe-inline in style-src", () => {
      vi.stubEnv("NODE_ENV", "production");
      const { csp } = generateCSP();

      expect(csp).not.toContain("'unsafe-inline'");
    });

    it("includes upgrade-insecure-requests", () => {
      vi.stubEnv("NODE_ENV", "production");
      const { csp } = generateCSP();

      expect(csp).toContain("upgrade-insecure-requests");
    });

    it("does not include unsafe-eval in script-src", () => {
      vi.stubEnv("NODE_ENV", "production");
      const { csp } = generateCSP();

      expect(csp).not.toContain("'unsafe-eval'");
    });

    it("includes strict-dynamic", () => {
      vi.stubEnv("NODE_ENV", "production");
      const { csp } = generateCSP();

      expect(csp).toContain("'strict-dynamic'");
    });
  });

  describe("development mode (NODE_ENV === 'development')", () => {
    it("includes nonce in script-src", () => {
      vi.stubEnv("NODE_ENV", "development");
      const { csp, nonce } = generateCSP();

      expect(csp).toContain(`script-src 'self' 'nonce-${nonce}' 'unsafe-eval' 'strict-dynamic';`);
    });

    it("uses unsafe-inline in style-src instead of nonce", () => {
      vi.stubEnv("NODE_ENV", "development");
      const { csp } = generateCSP();

      expect(csp).toContain(`style-src 'self' 'unsafe-inline';`);
    });

    it("includes unsafe-eval in script-src for React dev tools", () => {
      vi.stubEnv("NODE_ENV", "development");
      const { csp } = generateCSP();

      expect(csp).toContain("'unsafe-eval'");
    });

    it("does not include upgrade-insecure-requests to preserve localhost HTTP", () => {
      vi.stubEnv("NODE_ENV", "development");
      const { csp } = generateCSP();

      expect(csp).not.toContain("upgrade-insecure-requests");
    });

    it("includes unsafe-eval and strict-dynamic", () => {
      vi.stubEnv("NODE_ENV", "development");
      const { csp } = generateCSP();

      expect(csp).toContain("'unsafe-eval'");
      expect(csp).toContain("'strict-dynamic'");
    });
  });
});

describe("responseWithCSP", () => {
  it("sets the Content-Security-Policy header on the response", () => {
    const response = new NextResponse();
    const csp = "default-src 'self';";

    responseWithCSP(response, csp);

    expect(response.headers.get("Content-Security-Policy")).toBe(csp);
  });

  it("returns the same response object", () => {
    const response = new NextResponse();

    const result = responseWithCSP(response, "default-src 'self';");

    expect(result).toBe(response);
  });

  it("overwrites an existing Content-Security-Policy header", () => {
    const response = new NextResponse(null, {
      headers: { "Content-Security-Policy": "default-src 'none';" },
    });

    responseWithCSP(response, "default-src 'self';");

    expect(response.headers.get("Content-Security-Policy")).toBe("default-src 'self';");
  });
});
