"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/

import Link from "next/link";

import { useTranslation } from "@i18n";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/

export const PasswordAuthentication = () => {
  const { t } = useTranslation("account");

  return (
    <div className="mb-6 rounded-xl border-1 border-gray-300 bg-white p-6">
      <h3 id="password-title">{t("authentication.password")}</h3>
      {/* Placeholder password characters used instead of real password for security reasons */}
      <div className="mb-2">
        &#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;
      </div>
      <Link
        href="/password/change"
        prefetch={false}
        aria-describedby="password-title"
        data-testid="account-password-change"
      >
        {t("authentication.reset")}
      </Link>
    </div>
  );
};
