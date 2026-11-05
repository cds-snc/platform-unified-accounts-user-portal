"use client";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { useTranslation } from "./client";
import { parseTranslationKey } from "./parseTranslationKey";
export function I18n({
  i18nKey,
  data,
  tagName: Tag = "span",
  ...props
}: {
  i18nKey: string;
  children?: React.ReactNode;
  data?: Record<string, unknown>;
  tagName?: "span" | "p" | "div";
} & React.HTMLAttributes<HTMLElement>) {
  const { namespace, key: translationKey } = parseTranslationKey(i18nKey);

  const { t } = useTranslation(namespace);

  return (
    <Tag data-i18n-key={i18nKey} {...props}>
      {t(translationKey, { ...data, nsSeparator: false }) as string}
    </Tag>
  );
}
