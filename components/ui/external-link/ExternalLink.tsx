"use client";

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
  return (
    <div>
      <a target="_blank" rel="noopener noreferrer" href={href}>
        {t(i18nKey, { ns: namespace, lng: currentLang })}{" "}
      </a>
      <span
        className="gcds-icon gcds-icon-external ml-75"
        role="img"
        aria-label={t("externalLinkIconLabel", { ns: "common", lng: currentLang })}
        aria-hidden="false"
      ></span>
    </div>
  );
};
