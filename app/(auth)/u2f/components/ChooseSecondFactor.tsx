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
import { ENABLE_EMAIL_OTP } from "@root/constants/config";
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

  // Check if user has at least one strong MFA method (TOTP or U2F)
  const hasStrongFactor = userMethods.some(
    (m) => m === AuthenticationMethodType.TOTP || m === AuthenticationMethodType.U2F
  );

  const authMehods = userMethods.filter((method) => {
    if (method === AuthenticationMethodType.PASSWORD) {
      return false;
    }
    if (method === AuthenticationMethodType.OTP_EMAIL && !ENABLE_EMAIL_OTP) {
      return false;
    }
    // Only allow email OTP if user already has a strong factor (TOTP or U2F)
    if (method === AuthenticationMethodType.OTP_EMAIL && !hasStrongFactor) {
      return false;
    }
    return true;
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
              {method === AuthenticationMethodType.OTP_EMAIL && (
                <MethodOptionCard
                  method="email"
                  title={t("set.email.title")}
                  icon="/img/email_24px.png"
                  description={t("set.email.description")}
                  url={buildUrlWithRequestId("/otp/email", requestId)}
                  isSelected={selectedMethod === "email"}
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
