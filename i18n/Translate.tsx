"use client";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { useTranslation } from "./client";
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
  const [namespace, translationKey] = i18nKey.split(":");
  const { t } = useTranslation(namespace);

  return (
    <Tag data-i18n-key={i18nKey} {...props}>
      {t(translationKey, data) as string}
    </Tag>
  );
}
