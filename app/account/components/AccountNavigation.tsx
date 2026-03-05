"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import Link from "next/link";
import { usePathname } from "next/navigation";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getSiteLink, SiteConfig } from "@lib/site-config";
import { useTranslation } from "@i18n";

export function AccountNavigation({ siteConfig }: { siteConfig: SiteConfig }) {
  const pathname = usePathname();
  const {
    t,
    i18n: { language },
  } = useTranslation("account");

  const isAccountPage = pathname === "/account" || pathname.includes("/account/");
  const profileUrl = getSiteLink(siteConfig, "profile", language);

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
              <span aria-current="page" className="font-semibold text-gcds-grayscale-800">
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
        <li>
          <h2 className="text-base">
            <a href={profileUrl} className="text-gcds-grayscale-800 underline hover:no-underline">
              {t("navigation.profile")}
            </a>
          </h2>
        </li>
      </ul>
    </nav>
  );
}
