"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useTranslation } from "@i18n";
/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { useSiteConfig } from "@components/contexts/SiteConfigContext";
import { ExternalLink } from "@components/ui/external-link/ExternalLink";

export function AccountNavigation() {
  const pathname = usePathname();
  const { t } = useTranslation("account");
  const { getSiteLink } = useSiteConfig();
  const isAccountPage = pathname === "/account" || pathname.includes("/account/");

  const gcFormsLink = getSiteLink("gcForms");

  return (
    <nav
      aria-label={t("navigation.ariaLabel")}
      className="rounded-2xl border border-[#D1D5DB] bg-white p-6"
    >
      <h1 className="mb-6 text-3xl font-semibold">{t("navigation.title")}</h1>
      <ul className="list-none space-y-4 p-0">
        <li>
          <h2 className="text-base">
            {isAccountPage ? (
              <span aria-current="page" className="font-semibold text-gcds-green-750">
                {t("navigation.account")}
              </span>
            ) : (
              <Link
                href="/account"
                className="text-gcds-grayscale-800 underline hover:no-underline"
              >
                {t("navigation.account")}
              </Link>
            )}
          </h2>
        </li>
        {gcFormsLink && (
          <li>
            <ExternalLink href={gcFormsLink} i18nKey="gcForms" namespace="common" />
          </li>
        )}
      </ul>
    </nav>
  );
}
