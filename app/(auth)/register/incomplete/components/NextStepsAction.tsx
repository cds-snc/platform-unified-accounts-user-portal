"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { sendVerificationEmail } from "@root/app/(auth)/register/verify/action";
import { buildUrlWithRequestId } from "@lib/utils";
import { I18n } from "@i18n";
import { SubmitButton } from "@components/ui/button/SubmitButton";

const NextAction = {
  SEND_CODE: "sendCode",
  REDIRECT: "redirect",
} as const;

export type NextAction = (typeof NextAction)[keyof typeof NextAction];

interface NextStepActionProps {
  action: NextAction;
  text: string;
  namespace: string;
  redirect?: string;
  requestId?: string;
}
export const NextStepAction = ({
  action,
  text,
  namespace,
  redirect,
  requestId,
}: NextStepActionProps) => {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const nextStep = async () => {
    setWorking(true);
    switch (action) {
      case NextAction.SEND_CODE:
        const response = await sendVerificationEmail();
        if ("error" in response) {
          // Show an error?
          setWorking(false);
          return;
        }
        router.push(buildUrlWithRequestId("/password/verify", requestId));
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
    <form className="mt-4" action={nextStep}>
      <SubmitButton type="submit" loading={working}>
        <I18n i18nKey={text} namespace={namespace} />
      </SubmitButton>
    </form>
  );
};
