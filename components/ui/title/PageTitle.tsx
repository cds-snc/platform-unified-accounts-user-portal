"use client";

import { useTranslation } from "@i18n";
import { useRequestingApp } from "@components/contexts/RequestingAppContext";
export const PageTitle = ({ i18nKey, namespace }: { i18nKey: string; namespace: string }) => {
  const { t } = useTranslation([namespace]);
  const { requestingAppName } = useRequestingApp();

  return <title>{t(i18nKey, { app: requestingAppName ?? "" })}</title>;
};
