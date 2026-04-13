/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { cache } from "react";
import { headers } from "next/headers";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { serverTranslation } from "@i18n/server";

const deploymentId = process.env.NEXT_DEPLOYMENT_ID || "local";

const getVersion = cache(async (): Promise<string> => {
  try {
    const _headers = await headers();
    const host = _headers.get("host") || "localhost:3002";
    const protocol = _headers.get("x-forwarded-proto") || "https";
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

    const response = await fetch(`${protocol}://${host}${basePath}/version`, {
      next: { revalidate: 3600 }, // ISR: revalidate every hour
    });

    if (response.ok) {
      return await response.text();
    }
  } catch (error) {
    // Fallback silently if fetch fails
  }

  return "unknown";
});

export const Version = async () => {
  const fullVersion = await getVersion();
  const shortVersion = fullVersion.substring(0, 7);
  const { t } = await serverTranslation(["footer"]);

  return (
    <div className="mt-2 text-sm text-slate-800">
      {t("version")}: {shortVersion} <span className="hidden"> - {deploymentId}</span>
    </div>
  );
};
