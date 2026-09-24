"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import Link from "next/link";
import { useTranslation } from "react-i18next";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/

export const PasswordAuthentication = ({ className }: { className: string }) => {
  const { t } = useTranslation("account");

  return (
    <div className={className}>
      <div className="flex items-center justify-between">
        <h3 className="mb-6">{t("authentication.title")}</h3>
      </div>
      <div className="flex flex-row">
        <div className="grow">
          <div id="password-title" className="mb-1 font-semibold">
            {t("authentication.password")}
          </div>
          {/* Placeholder password characters used instead of real password for security reasons */}
          <div>
            &#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;
          </div>
        </div>
        <div className="flex">
          <Link href="/password/change" aria-describedby="password-title" className="mt-auto mb-1">
            {t("authentication.change")}
          </Link>
        </div>
      </div>
    </div>
  );
};
