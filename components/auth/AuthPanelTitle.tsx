"use client";
/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { parseTranslationKey } from "@root/i18n/parseTranslationKey";
import { useTranslation } from "@i18n";
import { useRequestingApp } from "@components/contexts/RequestingAppContext";
export const AuthPanelTitle = ({
  i18nKey,
  data,
  className,
}: {
  i18nKey: string;
  data?: Record<string, unknown>;
  className?: string;
}) => {
  const { namespace, key } = parseTranslationKey(i18nKey);
  const { t } = useTranslation(namespace);
  const { requestingAppName } = useRequestingApp();
  return (
    <div className={`mt-4 mb-6 ${className || ""}`}>
      <h1 className="mb-0" id="page-heading">
        {t(key, { ...data, app: requestingAppName, nsSeparator: false })}
      </h1>
    </div>
  );
};
