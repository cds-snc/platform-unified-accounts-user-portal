"use client";

import { useTranslation } from "@i18n";
export const PageTitle = ({ i18nKey, namespace }: { i18nKey: string; namespace: string }) => {
  const { t } = useTranslation(namespace);

  return <title>{t(i18nKey)}</title>;
};
