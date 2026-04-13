/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getShortVersion, getVersion } from "@lib/version";
import { serverTranslation } from "@i18n/server";

const deploymentId = process.env.NEXT_DEPLOYMENT_ID || "local";

export const Version = async () => {
  const shortVersion = getShortVersion(getVersion());
  const { t } = await serverTranslation(["footer"]);

  return (
    <div className="mt-2 text-sm text-slate-800">
      {t("version")}: {shortVersion} <span className="hidden"> - {deploymentId}</span>
    </div>
  );
};
