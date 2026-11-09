const fallbackLng = "en";
export const languages = [fallbackLng, "fr"];

const defaultNS = "common";

export function getOptions(lang: string = fallbackLng, ns: string | string[] = defaultNS) {
  return {
    supportedLngs: languages,
    fallbackLng,
    lng: lang,
    fallbackNS: defaultNS,
    defaultNS,
    ns,
  };
}

export const LANGUAGE_COOKIE_NAME = "i18next";
