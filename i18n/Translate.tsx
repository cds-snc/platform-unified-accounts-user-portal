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
  const { t } = useTranslation();

  return (
    <Tag data-i18n-key={i18nKey} {...props}>
      {t(i18nKey, data) as string}
    </Tag>
  );
}
