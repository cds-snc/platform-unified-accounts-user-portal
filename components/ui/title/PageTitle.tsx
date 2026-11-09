"use client";

import { parseTranslationKey } from "@root/i18n/parseTranslationKey";
import { useTranslation } from "@i18n";
import { useRequestingApp } from "@components/contexts/RequestingAppContext";
export const PageTitle = ({ i18nKey }: { i18nKey: string }) => {
  const { namespace, key } = parseTranslationKey(i18nKey);
  const { t } = useTranslation(namespace);
  const { requestingAppName } = useRequestingApp();

  return <title>{t(key, { app: requestingAppName ?? "", nsSeparator: false })}</title>;
};
