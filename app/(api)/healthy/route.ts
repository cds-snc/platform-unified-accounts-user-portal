/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { NextResponse } from "next/server";

import { getSigningSecrets } from "@lib/signing";

export async function GET() {
  const requiredEnvVars = [
    "NOTIFY_API_KEY",
    "TEMPLATE_ID",
    "ZITADEL_API_URL",
    "ZITADEL_ORGANIZATION",
    "HCAPTCHA_SITE_KEY",
    "HCAPTCHA_SECRET",
  ];
  const missing = requiredEnvVars.filter((key) => !process.env[key]);
  const hasServiceUserToken = Boolean(
    process.env.ZITADEL_SERVICE_USER_TOKEN || process.env.ZITADEL_SERVICE_USER_TOKEN_FILE
  );
  const hasSessionCookieSecrets = getSigningSecrets("ZITADEL_SESSION_COOKIE_SECRET", 32).length > 0;
  const hasPasswordResetSecrets = getSigningSecrets("PASSWORD_RESET_SECRET", 32).length > 0;

  if (
    missing.length > 0 ||
    !hasServiceUserToken ||
    !hasSessionCookieSecrets ||
    !hasPasswordResetSecrets
  ) {
    return NextResponse.json({ error: "Missing required environment variables" }, { status: 503 });
  }

  return NextResponse.json({ status: "ok" }, { status: 200 });
}
