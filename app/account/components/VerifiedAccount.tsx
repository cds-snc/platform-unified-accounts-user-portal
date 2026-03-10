"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trans, useTranslation } from "react-i18next";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { logMessage } from "@lib/logger";
import { logoutCurrentSession } from "@lib/server/session";
import { getSiteLink, SiteConfig } from "@lib/site-config";
import { cn } from "@lib/utils";
import { Button } from "@components/ui/button/Button";

export const VerifiedAccount = ({
  email,
  className,
  siteConfig,
}: {
  email: string;
  className?: string;
  siteConfig: SiteConfig;
}) => {
  const router = useRouter();
  const {
    t,
    i18n: { language },
  } = useTranslation("account");

  const logoutAndRedirectToRegister = async () => {
    try {
      const result = await logoutCurrentSession({ postLogoutRedirectUri: "/register" });
      if ("redirect" in result) {
        router.push(result.redirect);
      } else if ("error" in result) {
        throw new Error(result.error);
      }
    } catch (error) {
      logMessage.info(
        `Failed to log out user when redirecting to registration. Errors: ${JSON.stringify(error)}`
      );
    }
  };

  return (
    <>
      <div className={cn("rounded-2xl border border-highlight bg-white p-6", className)}>
        <div className="grid grid-cols-[1fr_auto] items-start gap-4">
          <div>
            <h3 className="mb-6">{t("verifiedAccount.title")}</h3>
            <div className="mb-1 font-semibold">{t("verifiedAccount.email")}</div>
            <div>
              <em>{email}</em>
            </div>
          </div>
          <p className="max-w-48 self-start text-left">
            <Trans
              i18nKey="verifiedAccount.changeMessage"
              ns="account"
              components={[
                <strong key="0" />,
                <Button key="1" theme="link" onClick={logoutAndRedirectToRegister} />,
                <Link key="2" href={getSiteLink(siteConfig, "support", language)} />,
              ]}
            />
          </p>
        </div>
      </div>
    </>
  );
};
