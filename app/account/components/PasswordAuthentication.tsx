"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/

import { useTranslation } from "@i18n";
import { LinkButton } from "@components/ui/button/LinkButton";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/

export const PasswordAuthentication = () => {
  const { t } = useTranslation("account");

  return (
    <div className="flex flex-row">
      <div className="grow">
        <h3 id="password-title" className="mb-6">
          {t("authentication.password")}
        </h3>
        {/* Placeholder password characters used instead of real password for security reasons */}
        <div>
          &#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;
        </div>
      </div>
      <div className="flex">
        <LinkButton.Primary
          href="/password/change"
          aria-describedby="password-title"
          className="my-auto"
          data-testid="account-password-change"
        >
          {t("authentication.change")}
        </LinkButton.Primary>
      </div>
    </div>
  );
};
