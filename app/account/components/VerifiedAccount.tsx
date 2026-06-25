/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/

import { cn } from "@lib/utils";
import { I18n } from "@i18n";
import { Button } from "@components/ui/button/Button";

import { logoutAndRegister } from "../actions";

export const VerifiedAccount = async ({
  email,
  className,
}: {
  email: string;
  className?: string;
}) => {
  return (
    <>
      <div className={cn("rounded-2xl border border-highlight bg-white p-6", className)}>
        <div className="grid grid-cols-[1fr_auto] items-start gap-4">
          <div>
            <h3 className="mb-6">
              <I18n i18nKey="verifiedAccount.title" namespace="account" />
            </h3>
            <div className="mb-1 font-semibold">
              <I18n i18nKey="verifiedAccount.email" namespace="account" />
            </div>
            <div>
              <em>{email}</em>
            </div>
          </div>
          <p className="max-w-48 self-start text-left">
            <strong>
              <I18n i18nKey="verifiedAccount.cannotBeChanged" namespace="account" />
            </strong>{" "}
            <Button theme="link" onClick={logoutAndRegister}>
              <I18n i18nKey="verifiedAccount.createNewAccount" namespace="account" />
            </Button>
          </p>
        </div>
      </div>
    </>
  );
};
