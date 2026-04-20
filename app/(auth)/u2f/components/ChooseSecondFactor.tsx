"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthenticationMethodType } from "@zitadel/proto/zitadel/user/v2/user_service_pb";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { buildUrlWithRequestId } from "@lib/utils";
import { cn } from "@lib/utils";
import { useTranslation } from "@i18n/client";
import { MethodOptionCard } from "@components/mfa/MethodOptionCard";
import { Button } from "@components/ui/button/Button";

type Props = {
  loginName?: string;
  sessionId?: string;
  requestId?: string;
  organization?: string;
  userMethods: AuthenticationMethodType[];
};

export function ChooseSecondFactor({ userMethods, requestId }: Props) {
  const router = useRouter();
  const { t } = useTranslation("mfa");
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [nextUrl, setNextUrl] = useState<string>("");

  const authMehods = userMethods.filter((method) => {
    if (method === AuthenticationMethodType.U2F || AuthenticationMethodType.TOTP) {
      return true;
    }
    return false;
  });

  const handleMethodSelect = (method: string, url: string) => {
    setSelectedMethod(method);
    setNextUrl(url);
  };

  const handleContinue = () => {
    if (nextUrl) {
      router.push(nextUrl);
    }
  };

  return (
    <>
      <div className={cn("grid w-full grid-cols-1 pt-4", authMehods.length >= 2 && "gap-5")}>
        {authMehods.map((method, i) => {
          return (
            <div key={"method-" + i}>
              {method === AuthenticationMethodType.TOTP && (
                <MethodOptionCard
                  method="authenticator"
                  title={t("set.authenticator.title")}
                  icon="/img/verified_user_24px.png"
                  description={t("set.authenticator.description")}
                  url={buildUrlWithRequestId("/otp/time-based", requestId)}
                  isSelected={selectedMethod === "authenticator"}
                  onSelect={handleMethodSelect}
                />
              )}
              {method === AuthenticationMethodType.U2F && (
                <MethodOptionCard
                  method="securityKey"
                  title={t("set.securityKey.title")}
                  icon="/img/fingerprint_24px.png"
                  description={t("set.securityKey.description")}
                  url={buildUrlWithRequestId("/u2f", requestId)}
                  isSelected={selectedMethod === "securityKey"}
                  onSelect={handleMethodSelect}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex justify-start">
        <Button theme="primary" disabled={!selectedMethod} onClick={handleContinue}>
          {t("set.continue") || "Continue"}
        </Button>
      </div>
    </>
  );
}
