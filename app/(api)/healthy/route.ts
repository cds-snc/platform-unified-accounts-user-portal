/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { NextResponse } from "next/server";
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

  if (missing.length > 0 || !hasServiceUserToken) {
    return NextResponse.json({ error: "Missing required environment variables" }, { status: 503 });
  }

  return NextResponse.json({ status: "ok" }, { status: 200 });
}
