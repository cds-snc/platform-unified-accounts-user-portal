"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { useTranslation } from "react-i18next";

import { cn } from "@lib/utils";
/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { LinkButton } from "@components/ui/button/LinkButton";

export const PasswordAuthentication = ({ className }: { className: string }) => {
  const { t } = useTranslation("account");

  return (
    <>
      <div className={cn("rounded-2xl border-1 border-[#D1D5DB] bg-white p-6", className)}>
        <div className="flex items-center justify-between">
          {/* Added for logical heading structure but style like an H3 for now to meet design*/}
          <h2 className="mb-6 text-xl font-semibold tablet:text-2xl">
            {t("authentication.title")}
          </h2>
          <div>
            <LinkButton.Primary href="/password/change" aria-describedby="password-title">
              {t("authentication.change")}
            </LinkButton.Primary>
          </div>
        </div>
        <div>
          <div id="password-title" className="mb-1 font-semibold">
            {t("authentication.password")}
          </div>
          {/* Placeholder password characters used instead of real password for security reasons */}
          <div>
            &#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;
          </div>
        </div>
      </div>
    </>
  );
};
