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
    "ZITADEL_SERVICE_USER_TOKEN",
  ];
  const missing = requiredEnvVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    return NextResponse.json({ error: "Missing required environment variables" }, { status: 503 });
  }

  return NextResponse.json({ status: "ok" }, { status: 200 });
}
