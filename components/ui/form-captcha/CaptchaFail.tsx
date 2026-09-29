"use client";
import { useEffect, useRef } from "react";

import { useTranslation } from "@i18n/client";

// Displayed when a suspicious user is dectected by Captcha.
export const CaptchaFail = () => {
  const { t } = useTranslation("hCaptcha");
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Let AT know the page title has changed by updating the document title
  const newTitle = `${t("failPage.title")} - ${t("contact-us:title")}`;
  useEffect(() => {
    const previousTitle = document.title;
    document.title = newTitle;
    return () => {
      if (document.title === newTitle) {
        document.title = previousTitle;
      }
    };
  }, [newTitle]);

  // Also focus the title since not all AT reliably announce changes to the document title
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <>
      <h2 ref={headingRef} tabIndex={-1}>
        {t("failPage.title")}
      </h2>
      <p className="mb-4">{t("failPage.helpOptions.title")}</p>
      <ul className="mb-4">
        <li>{t("failPage.helpOptions.item1")}</li>
        <li>{t("failPage.helpOptions.item2")}</li>
        <li>{t("failPage.helpOptions.item3")}</li>
      </ul>
      <p>{t("failPage.helpOptions.tryAgain")}</p>
    </>
  );
};
