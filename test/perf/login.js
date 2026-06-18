/**
 * k6 – Login Flow (headless, TOTP MFA)
 * Simulates: username+password → TOTP verification → OIDC callback.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * OIDC AUTH REQUEST
 * ──────────────────────────────────────────────────────────────────────────────
 * Each VU gets a fresh Zitadel authRequest ID by navigating the browser to
 * Zitadel's /oauth/v2/authorize endpoint. Zitadel creates the auth request and
 * redirects to BASE_URL/?requestId=oidc_<id> automatically.
 *
 * The OIDC callback (REDIRECT_URI) is intercepted via page.route() so the
 * relying-party application does not need to be running. Successful auth is
 * confirmed by the presence of `code=` in the final URL.
 *
 * Omit ZITADEL_URL / CLIENT_ID / REDIRECT_URI to run without an OIDC context.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * ENVIRONMENT VARIABLES
 * ──────────────────────────────────────────────────────────────────────────────
 *   ZITADEL_URL       Zitadel instance URL           required
 *   TEST_USERNAME     Login username (gov email)     required
 *   TEST_PASSWORD     Login password                 required
 *   TOTP_SECRET       Base32-encoded TOTP secret     required
 *   CLIENT_ID         OIDC client_id                 required for OIDC flow
 *   REDIRECT_URI      OIDC redirect_uri              required for OIDC flow
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * USAGE
 * ──────────────────────────────────────────────────────────────────────────────
 * Non-OIDC mode
 *
 *  k6 run \
 *    -e ZITADEL_URL=https://auth.cdssandbox.xyz \
 *    -e TEST_USERNAME=testuser@gc.ca \
 *    -e TEST_PASSWORD=SecurePass123! \
 *    -e TOTP_SECRET=JBSWY3DPEHPK3PXP \
 *    test/perf/login.js
 *
 * OIDC mode (with PKCE)
 *
 *  k6 run \
 *    -e ZITADEL_URL=https://auth.cdssandbox.xyz \
 *    -e TEST_USERNAME=testuser@gc.ca \
 *    -e TEST_PASSWORD=SecurePass123! \
 *    -e TOTP_SECRET=JBSWY3DPEHPK3PXP \
 *    -e CLIENT_ID=1234567890 \
 *    -e REDIRECT_URI=http://localhost/auth/callback \
 *    test/perf/login.js
 *
 */

import { check, fail } from "k6";
import { browser } from "k6/browser";
import crypto from "k6/crypto";
import encoding from "k6/encoding";
import http from "k6/http";

const ZITADEL_URL = __ENV.ZITADEL_URL;
const USERNAME = __ENV.TEST_USERNAME;
const PASSWORD = __ENV.TEST_PASSWORD;
const TOTP_SECRET = __ENV.TOTP_SECRET;
const CLIENT_ID = __ENV.CLIENT_ID || "";
const REDIRECT_URI = __ENV.REDIRECT_URI || "";

export const options = {
  scenarios: {
    login_flow: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "3m", target: 5 },
        { duration: "17m", target: 5 },
      ],
      gracefulRampDown: "30s",
      gracefulStop: "30s",
      options: {
        browser: {
          type: "chromium",
        },
      },
    },
  },
  thresholds: {
    browser_http_req_duration: ["p(95)<1000"],
    browser_http_req_failed: ["rate<0.01"],
  },
};

/**
 * Decode a Base32 string to a Uint8Array.
 */
function base32Decode(encoded) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const sanitized = encoded.replace(/=+$/, "").toUpperCase().replace(/\s/g, "");

  const output = [];
  let bits = 0;
  let value = 0;

  for (let i = 0; i < sanitized.length; i++) {
    const idx = alphabet.indexOf(sanitized[i]);
    if (idx === -1) continue; // skip unknown chars
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return new Uint8Array(output);
}

/**
 * Encode a 64-bit integer as an 8-byte big-endian Uint8Array.
 */
function counterToBytes(counter) {
  const bytes = new Uint8Array(8);
  // Write low 32 bits
  bytes[7] = counter & 0xff;
  bytes[6] = (counter >>> 8) & 0xff;
  bytes[5] = (counter >>> 16) & 0xff;
  bytes[4] = (counter >>> 24) & 0xff;
  // High bits (counter rarely exceeds 32-bit range in practice)
  const high = Math.floor(counter / 0x100000000);
  bytes[3] = high & 0xff;
  bytes[2] = (high >>> 8) & 0xff;
  bytes[1] = (high >>> 16) & 0xff;
  bytes[0] = (high >>> 24) & 0xff;
  return bytes;
}

/**
 * Generate a TOTP code using HMAC-SHA1 (RFC 6238).
 * @param {string} base32Secret - Base32-encoded TOTP secret
 * @param {number} [timeStep=30]
 * @param {number} [digits=6]
 * @returns {string} Zero-padded OTP code
 */
function generateTOTP(base32Secret, timeStep = 30, digits = 6) {
  const counter = Math.floor(Date.now() / 1000 / timeStep);
  const keyBytes = base32Decode(base32Secret);
  const counterBytes = counterToBytes(counter);

  // crypto.hmac returns an ArrayBuffer when encoding is 'binary'
  const hmacBuf = crypto.hmac("sha1", keyBytes.buffer, counterBytes.buffer, "binary");
  const hmac = new Uint8Array(hmacBuf);

  // Dynamic truncation
  const offset = hmac[hmac.length - 1] & 0x0f;
  const truncated =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const code = truncated % Math.pow(10, digits);
  return String(code).padStart(digits, "0");
}

// ─── PKCE helpers (RFC 7636) ──────────────────────────────────────────────────

/**
 * Generate a random code_verifier (32 bytes → 43-char base64url string).
 */
function generateCodeVerifier() {
  const bytes = new Uint8Array(32);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return encoding.b64encode(bytes.buffer, "rawurl");
}

/**
 * Derive code_challenge = BASE64URL(SHA-256(verifier))
 */
function generateCodeChallenge(verifier) {
  const hashBuf = crypto.sha256(verifier, "binary");
  return encoding.b64encode(hashBuf, "rawurl");
}

/**
 * Generate a random delay to simulate user think time.
 */
function randomDelay() {
  const minDelayMs = 1000;
  const maxDelayMs = 3000;
  return new Promise((resolve) => {
    const delayMs = Math.floor(Math.random() * (maxDelayMs - minDelayMs + 1)) + minDelayMs;
    setTimeout(resolve, delayMs);
  });
}

// ─── OIDC token exchange ──────────────────────────────────────────────────────

/**
 * Extract the authorization code from a callback URL and POST to
 * /oauth/v2/token. Supports PKCE (public clients).
 * @param {string} callbackUrl
 * @param {string} codeVerifier
 */
function completeTokenExchange(callbackUrl, codeVerifier) {
  const codeMatch = callbackUrl.match(/[?&]code=([^&]+)/);
  const authCode = codeMatch ? decodeURIComponent(codeMatch[1]) : null;

  check(authCode, {
    "OIDC: auth code received": (code) => !!code,
  });

  if (!authCode) {
    console.error(`OIDC callback missing auth code: ${callbackUrl}`);
    return;
  }

  const tokenBody = {
    grant_type: "authorization_code",
    code: authCode,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
  };
  tokenBody.code_verifier = codeVerifier;

  const tokenRes = http.post(`${ZITADEL_URL}/oauth/v2/token`, tokenBody);

  const tokenResponse = check(tokenRes, {
    "OIDC: token exchange succeeded": (r) => r.status === 200,
    "OIDC: access_token present": (r) => {
      try {
        return !!JSON.parse(r.body).access_token;
      } catch {
        return false;
      }
    },
  });

  if (!tokenResponse) {
    console.error(`OIDC token exchange failed: ${tokenRes.status} ${tokenRes.body}`);
  }
}

/**
 * Main test scenario
 */
export default async function loginFlow() {
  if (!ZITADEL_URL || !USERNAME || !PASSWORD || !TOTP_SECRET) {
    fail("Missing required environment variables.");
  }

  // If OIDC vars are set, navigate the browser to Zitadel's authorize endpoint.
  // Zitadel creates a fresh per-VU auth request and redirects to
  // ZITADEL_URL/?requestId=oidc_<id> automatically.
  const useOidc = Boolean(CLIENT_ID && REDIRECT_URI);
  const codeVerifier = useOidc ? generateCodeVerifier() : null;
  const codeChallenge = useOidc ? generateCodeChallenge(codeVerifier) : null;

  const loginPageUrl = useOidc
    ? `${ZITADEL_URL}/oauth/v2/authorize?` +
      `client_id=${encodeURIComponent(CLIENT_ID)}&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `response_type=code&` +
      `scope=openid` +
      `&code_challenge=${codeChallenge}&code_challenge_method=S256`
    : `${ZITADEL_URL}/`;

  // Use an explicit context so we can close it in the finally block.
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Route handler acts as the fake RP: it extracts the auth code from
    // the intercepted request URL and requests the ID and access tokens to
    // fully test the OIDC flow.
    if (useOidc) {
      let isTokenExchangeStarted = false;
      await page.route(
        new RegExp(`^${REDIRECT_URI.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`),
        async (route) => {
          if (!isTokenExchangeStarted) {
            isTokenExchangeStarted = true; // prevent multiple calls
            completeTokenExchange(route.request().url(), codeVerifier);
          }
          await route.fulfill({
            status: 200,
            headers: { "content-type": "text/html; charset=utf-8" },
            body: "<!doctype html><html><body>stub RP ok</body></html>",
          });
        }
      );
    }

    // ─── Login page ─────────────────────────────────────
    await randomDelay();
    await page.goto(loginPageUrl, { waitUntil: "load" });
    const loginPageOk = check(page, {
      "login page: username field present": () => page.locator("#username").isVisible(),
      "login page: password field present": () => page.locator("#password").isVisible(),
    });
    if (!loginPageOk) {
      console.error(`Login page did not render expected fields at: ${page.url()}`);
      return;
    }

    // ─── Login page submit ──────────────────────────────
    await page.locator("#username").fill(USERNAME);
    await page.locator("#password").fill(PASSWORD);
    await page.locator("form#login button[type=submit]").click();
    await randomDelay();
    await page.waitForNavigation({ waitUntil: "load" });

    // ─── TOTP page ──────────────────────────────────────
    const totpPageOk = check(page, {
      "TOTP page: code input present": () => page.locator("#code").isVisible(),
    });
    if (!totpPageOk) {
      console.error(`TOTP page did not render expected fields at: ${page.url()}`);
      return;
    }

    // ─── TOTP page submit ───────────────────────────────
    const totpCode = generateTOTP(TOTP_SECRET);
    await page.locator("#code").fill(totpCode);
    await page.locator("form#totp button[type=submit]").click();
    await randomDelay();
    await page.waitForNavigation({ waitUntil: "load" });

    // In non-OIDC mode, successful login ends on the /account page
    if (!useOidc) {
      const accountPageOk = check(page, {
        "Account: page loaded": () => page.locator("#personal-details-title").isVisible(),
      });
      if (!accountPageOk) {
        console.error("Failed to login with TOTP");
      }
    }
  } finally {
    // Cleanup browser resources
    await page.close();
    await context.close();
  }
}

/**
 * setup() runs once before VUs start
 */
export function setup() {
  console.log(`=== k6 Browser Login Flow Test ===`);
  console.log(`Target: ${ZITADEL_URL}`);
  console.log(`User:   ${USERNAME}`);
  const oidcMode =
    CLIENT_ID && REDIRECT_URI ? `${ZITADEL_URL} → ${REDIRECT_URI} (PKCE)` : "disabled";
  console.log(`OIDC:   ${oidcMode}`);
}
