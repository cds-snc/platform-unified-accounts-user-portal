"use client";
/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
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
  const { t } = useTranslation();
  const { requestingAppName } = useRequestingApp();
  return (
    <div className={`mt-4 mb-6 ${className || ""}`}>
      <h1 className="mb-0" id="page-heading">
        {t(i18nKey, { ...data, app: requestingAppName })}
      </h1>
    </div>
  );
};
