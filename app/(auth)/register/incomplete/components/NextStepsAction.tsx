"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { sendVerificationEmail } from "@root/app/(auth)/register/verify/action";
import { getSafeErrorMessageFromKey } from "@lib/safeErrorMessage";
import { buildUrlWithRequestId } from "@lib/utils";
import { I18n, useTranslation } from "@i18n";
import { SubmitButton } from "@components/ui/button/SubmitButton";
import { Alert, ErrorStatus } from "@components/ui/form";

const NextAction = {
  SEND_CODE: "sendCode",
  REDIRECT: "redirect",
} as const;

export type NextAction = (typeof NextAction)[keyof typeof NextAction];

interface NextStepActionProps {
  action: NextAction;
  text: string;
  redirect?: string;
  requestId?: string;
}
export const NextStepAction = ({ action, text, redirect, requestId }: NextStepActionProps) => {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [errorKey, setErrorKey] = useState("");
  const { t } = useTranslation("verify");

  const nextStep = async () => {
    setWorking(true);
    switch (action) {
      case NextAction.SEND_CODE:
        setErrorKey("");
        const response = await sendVerificationEmail();
        if ("errorKey" in response) {
          setErrorKey(response.errorKey);
          setWorking(false);
          return;
        }
        router.push(buildUrlWithRequestId("/register/verify", requestId));
        break;
      case NextAction.REDIRECT:
        if (!redirect) {
          throw new Error("Must provide redirect URL");
        }
        router.push(redirect);
        break;
    }
  };
  return (
    <>
      {errorKey && (
        <div className="py-4">
          <Alert type={ErrorStatus.ERROR} focussable>
            {getSafeErrorMessageFromKey({
              errorKey,
              fallbackKey: "errors.couldNotResentEmail",
              allowedErrorKeys: ["errors.couldNotResentEmail"],
              t,
            })}
          </Alert>
        </div>
      )}
      <form className="mt-4" action={nextStep}>
        <SubmitButton type="submit" loading={working}>
          <I18n i18nKey={text} />
        </SubmitButton>
      </form>
    </>
  );
};
