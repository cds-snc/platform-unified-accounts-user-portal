"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import Link from "next/link";
import { usePathname } from "next/navigation";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { useTranslation } from "@i18n";

const PROFILE_PORTAL_BASE_URL = process.env.NEXT_PUBLIC_FORMS_PRODUCTION_URL;

export function AccountNavigation() {
  const pathname = usePathname();
  const {
    t,
    i18n: { language },
  } = useTranslation("account");

  const isAccountPage = pathname === "/account" || pathname.includes("/account/");

  // Note: this will need to be updated later to be dynamic or based on a site configuration
  const profileUrl = PROFILE_PORTAL_BASE_URL
    ? new URL(`/${language}/profile/oidc`, PROFILE_PORTAL_BASE_URL)
    : null;

  return (
    <nav
      aria-label={t("navigation.ariaLabel")}
      className="rounded-2xl border border-[#D1D5DB] bg-white p-6"
    >
      <h1 className="mb-6 text-3xl font-semibold">{t("navigation.title")}</h1>
      <ul className="list-none space-y-4 p-0">
        <li>
          {isAccountPage ? (
            <span aria-current="page" className="font-semibold text-gcds-blue-700">
              {t("navigation.account")}
            </span>
          ) : (
            <Link href="/account" className="text-gcds-grayscale-800 underline hover:no-underline">
              {t("navigation.account")}
            </Link>
          )}
        </li>
        {profileUrl && (
          <li>
            <a
              href={profileUrl.toString()}
              className="text-gcds-grayscale-800 underline hover:no-underline"
            >
              {t("navigation.profile")}
            </a>
          </li>
        )}
      </ul>
    </nav>
  );
}
