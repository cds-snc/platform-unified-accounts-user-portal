"use client";

import { useId } from "react";

import { useTranslation } from "@i18n/client";

export const ExternalLink = ({
  href,
  i18nKey,
  namespace,
}: {
  href: string;
  i18nKey: string;
  namespace: string;
}) => {
  const {
    t,
    i18n: { language: currentLang },
  } = useTranslation("header");
  const id = useId();
  return (
    <div>
      <a target="_blank" rel="noopener noreferrer" href={href} aria-describedby={id}>
        {t(i18nKey, { ns: namespace, lng: currentLang })}{" "}
      </a>
      <span
        id={id}
        className="gcds-icon gcds-icon-external ml-75"
        role="img"
        aria-label={t("externalLinkIconLabel", { ns: "common", lng: currentLang })}
        aria-hidden="false"
      ></span>
    </div>
  );
};
