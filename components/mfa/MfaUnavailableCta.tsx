"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import Link from "next/link";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { useTranslation } from "@i18n";

export function MfaUnavailableCta() {
  const { t } = useTranslation("mfa");

  return (
    <p className="mt-8" data-testid="mfa-unavailable-cta">
      {t("unavailable.text")}{" "}
      <Link href="/contact-us" data-testid="mfa-unavailable-contact-us">
        {t("unavailable.link")}
      </Link>
      .
    </p>
  );
}
