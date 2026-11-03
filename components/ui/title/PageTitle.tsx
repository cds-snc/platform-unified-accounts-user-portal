"use client";

import { useTranslation } from "@i18n";
import { useRequestingApp } from "@components/contexts/RequestingAppContext";
export const PageTitle = ({ i18nKey }: { i18nKey: string }) => {
  const { t } = useTranslation();
  const { requestingAppName } = useRequestingApp();

  return <title>{t(i18nKey, { app: requestingAppName ?? "" })}</title>;
};
