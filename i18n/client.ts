"use client";
/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import i18next from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import resourcesToBackend from "i18next-resources-to-backend";
import { initReactI18next, useTranslation as reactUseTranslation } from "react-i18next";

/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/
import { getOptions, LANGUAGE_COOKIE_NAME } from "./settings";

const languageDetector = new LanguageDetector();

i18next
  .use(initReactI18next)
  .use(languageDetector)
  .use(
    resourcesToBackend((language: string, namespace: string) =>
      import(`./locales/${language}.json`).then((mod) => mod[namespace])
    )
  )
  .init({
    ...getOptions(),
    lng: undefined, // detect the language on client side
    detection: {
      order: ["localstorage", "cookie"],
      lookupCookie: LANGUAGE_COOKIE_NAME,
      lookupLocalStorage: "i18nextLng",
      caches: ["localStorage", "cookie"],
    },
    debug: process.env.I18N_DEBUG === "true",
  });

export function useTranslation(ns?: string | string[], options?: Record<string, unknown>) {
  const clientHook = reactUseTranslation(ns, options);

  return clientHook;
}
