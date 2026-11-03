/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getShortVersion, VERSION } from "@lib/version";
import { serverTranslation } from "@i18n/server";

const deploymentId = process.env.NEXT_DEPLOYMENT_ID || "local";

export const Version = async () => {
  const shortVersion = getShortVersion(VERSION);
  const { t } = await serverTranslation();

  return (
    <div className="mt-2 text-sm text-slate-800">
      {t("footer:version")}: {shortVersion} <span className="hidden"> - {deploymentId}</span>
    </div>
  );
};
