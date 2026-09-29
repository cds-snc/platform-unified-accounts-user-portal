/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { ReactNode } from "react";

import { getCallingApp } from "@lib/oidcClient";
/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getImageUrl } from "@lib/utils/imageUrl";
import { I18n } from "@i18n";
import { RequestingAppProvider } from "@components/contexts/RequestingAppContext";
import { Image } from "@components/ui/image/Image";
import { PageTitle } from "@components/ui/title/PageTitle";

/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/
import { AuthPanelTitle } from "./AuthPanelTitle";
interface AuthPanelProps {
  titleI18nKey: string;
  pageTitleI18nKey?: string;
  descriptionI18nKey: string;
  namespace: string;
  beforeTitle?: ReactNode;
  children?: ReactNode;
  imageSrc?: string;
  wide?: boolean;
  variant?: "default" | "narrow" | "wide";
  requestId?: string;
}

export const AuthPanel = async ({
  titleI18nKey,
  pageTitleI18nKey,
  descriptionI18nKey,
  namespace,
  children,
  imageSrc,
  variant = "default",
  requestId,
}: AuthPanelProps) => {
  const panelId =
    variant === "wide"
      ? "auth-panel-wide"
      : variant === "narrow"
        ? "auth-panel-narrow"
        : "auth-panel";

  const callingApp = requestId ? await getCallingApp(requestId) : undefined;

  return (
    <RequestingAppProvider appName={callingApp}>
      <div id={panelId}>
        <PageTitle i18nKey={pageTitleI18nKey ?? titleI18nKey} namespace={namespace} />
        {imageSrc && (
          <div className="mb-6 flex justify-center">
            <Image src={getImageUrl(imageSrc)} alt="" width={125} height={96} />
          </div>
        )}

        {titleI18nKey !== "none" && (
          <AuthPanelTitle
            i18nKey={titleI18nKey}
            namespace={namespace}
            className={imageSrc ? "text-center" : ""}
          />
        )}
        {descriptionI18nKey !== "none" && (
          <I18n i18nKey={descriptionI18nKey} namespace={namespace} tagName="p" className="mb-6" />
        )}
        {children}
      </div>
    </RequestingAppProvider>
  );
};
