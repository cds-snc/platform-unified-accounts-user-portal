"use client";

import { useId } from "react";

import { parseTranslationKey } from "@root/i18n/parseTranslationKey";
import { useTranslation } from "@i18n/client";

export const ExternalLink = ({ href, i18nKey }: { href: string; i18nKey: string }) => {
  const { namespace, key } = parseTranslationKey(i18nKey);
  const {
    t,
    i18n: { language: currentLang },
  } = useTranslation([namespace, "common"]);
  const id = useId();
  return (
    <div>
      <a target="_blank" rel="noopener noreferrer" href={href} aria-describedby={id}>
        {t(key, { ns: namespace, lng: currentLang, nsSeparator: false })}{" "}
      </a>
      <span id={id} className="sr-only">
        {t("externalLinkIconLabel", { ns: "common", lng: currentLang })}
      </span>
      <span className="gcds-icon gcds-icon-external ml-75" aria-hidden="true"></span>
    </div>
  );
};
