"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { useActionState } from "react";
import Link from "next/link";

import { I18n } from "@i18n";
import { useTranslation } from "@i18n/client";
import { useSiteConfig } from "@components/contexts/SiteConfigContext";
/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { BackButton } from "@components/ui/button/BackButton";
import { SubmitButtonAction } from "@components/ui/button/SubmitButton";
import { Alert, ErrorStatus } from "@components/ui/form";
import { toast } from "@components/ui/toast/Toast";

import { resendPasswordResetEmail } from "../../actions";

export function ResendCode() {
  const { t } = useTranslation("password");
  const { getSiteLink } = useSiteConfig();
  const supportLink = getSiteLink("support");

  const [state, formAction] = useActionState(async () => {
    try {
      const result = await resendPasswordResetEmail();
      if ("success" in result) {
        toast.success(t("reset.sent.resendRequested"));
      }
    } catch {
      return { error: "errors.couldNotSendResetLink" };
    }
  }, undefined);

  return (
    <div className="w-full">
      <p className="mt-6">
        <I18n i18nKey="password:reset.sent.linkExpires" />
      </p>
      {state && "error" in state && (
        <div className="mt-8">
          <Alert type={ErrorStatus.ERROR} focussable={true}>
            {t("errors.couldNotSendResetLink")}
          </Alert>
        </div>
      )}
      <form id="resend-code" action={formAction} noValidate>
        <div className="mt-6 flex items-center gap-4">
          <BackButton />
          <SubmitButtonAction dataTestId="resend-submit">
            <I18n i18nKey="password:reset.sent.resendLink" />
          </SubmitButtonAction>
        </div>
      </form>

      <div className="mt-4 flex items-center gap-4">
        {supportLink && (
          <Link href={supportLink} prefetch={false}>
            <I18n i18nKey="verify:help" />
          </Link>
        )}
      </div>
    </div>
  );
}
