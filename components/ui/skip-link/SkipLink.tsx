"use client";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { useTranslation } from "@i18n/client";
export const SkipLink = () => {
  const { t } = useTranslation("layout");

  return (
    <div id="skip-link-container">
      <a href="#content" id="skip-link">
        {t("skip-link")}
      </a>
    </div>
  );
};
