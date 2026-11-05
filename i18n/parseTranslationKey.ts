import { logMessage } from "@lib/logger";

export function parseTranslationKey(i18nKey: unknown): { namespace: string; key: string } {
  const isString = typeof i18nKey === "string";
  const isEmpty = isString && i18nKey.length === 0;
  const hasWhitespace = isString && /\s/.test(i18nKey);

  if (!isString || isEmpty || hasWhitespace) {
    // Carefully log the input type and include only string values to avoid unsafe serialization
    logMessage.warn("Invalid translation key. Falling back to common namespace.", {
      inputType: i18nKey === null ? "null" : typeof i18nKey,
      ...(typeof i18nKey === "string" && { translationKey: i18nKey }),
    });
    return { namespace: "common", key: typeof i18nKey === "string" ? i18nKey : "" };
  }

  const [namespaceOrKey, translationKey, ...extraSegments] = i18nKey.split(":");

  // Allow an intentionally missing namespace, e.g. "required" should default to "common" namespace
  if (translationKey === undefined) {
    return { namespace: "common", key: i18nKey };
  }

  if (!namespaceOrKey || !translationKey || extraSegments.length > 0) {
    logMessage.warn("Malformed translation key. Falling back to common namespace.", {
      translationKey: i18nKey,
    });
    return { namespace: "common", key: i18nKey };
  }

  return {
    namespace: namespaceOrKey,
    key: translationKey,
  };
}
