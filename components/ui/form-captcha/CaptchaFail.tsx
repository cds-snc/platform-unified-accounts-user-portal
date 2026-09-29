"use client";
import { useTranslation } from "@i18n/client";

// Displayed when a suspicious user is dectected by Captcha.
export const CaptchaFail = () => {
  const { t } = useTranslation("hCaptcha");
  return (
    <>
      <h2>{t("failPage.title")}</h2>
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
