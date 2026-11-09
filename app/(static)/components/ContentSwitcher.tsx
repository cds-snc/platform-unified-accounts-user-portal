"use client";
import type { JSX } from "react";

import { useTranslation } from "@i18n";

export const ContentSwitcher = ({
  enContent,
  frContent,
}: {
  enContent: JSX.Element;
  frContent: JSX.Element;
}) => {
  const { i18n } = useTranslation();

  if (i18n.language === "fr") {
    return frContent;
  }

  return enContent;
};
