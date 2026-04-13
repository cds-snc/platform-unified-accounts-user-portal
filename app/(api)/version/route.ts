import { NextResponse } from "next/server";

import { getVersion } from "@lib/version";

export const dynamic = "force-static";

const VERSION = getVersion();

export function GET() {
  return new NextResponse(VERSION, {
    status: 200,
    headers: { "content-type": "text/plain" },
  });
}
