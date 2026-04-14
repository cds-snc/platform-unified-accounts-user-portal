/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { ReactNode } from "react";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getImageUrl } from "@lib/imageUrl";
import { I18n } from "@i18n";
import { Image } from "@components/ui/image/Image";

/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/
import { AuthPanelTitle } from "./AuthPanelTitle";
interface AuthPanelProps {
  titleI18nKey: string;
  descriptionI18nKey: string;
  namespace: string;
  beforeTitle?: ReactNode;
  titleData?: Record<string, string | undefined>;
  children?: ReactNode;
  imageSrc?: string;
  wide?: boolean;
}

export const AuthPanel = ({
  titleI18nKey,
  descriptionI18nKey,
  namespace,
  titleData,
  children,
  imageSrc,
  wide = false,
}: AuthPanelProps) => {
  return (
    <div id={wide ? "auth-panel-wide" : "auth-panel"}>
      {imageSrc && (
        <div className="mb-6 flex justify-center">
          <Image src={getImageUrl(imageSrc)} alt="" width={125} height={96} />
        </div>
      )}

      {titleI18nKey !== "none" && (
        <AuthPanelTitle
          i18nKey={titleI18nKey}
          namespace={namespace}
          data={titleData}
          className={imageSrc ? "text-center" : ""}
        />
      )}
      {descriptionI18nKey !== "none" && (
        <I18n i18nKey={descriptionI18nKey} namespace={namespace} tagName="p" className="mb-6" />
      )}
      {children}
    </div>
  );
};
