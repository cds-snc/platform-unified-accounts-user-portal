/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import Link from "next/link";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { serverTranslation } from "@i18n/server";

export async function MfaUnavailableCta() {
  const { t } = await serverTranslation("mfa");

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
