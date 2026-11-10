"use client";
import { JSX } from "react";

import { useTranslation } from "@i18n";

export const ContentSwitcher = ({ en, fr }: { en: JSX.Element; fr: JSX.Element }) => {
  const { i18n } = useTranslation();

  if (i18n.language === "fr") {
    return fr;
  }
  return en;
};
