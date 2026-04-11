"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { useState } from "react";
import { useRouter } from "next/navigation";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { ENABLE_EMAIL_OTP } from "@root/constants/config";
import { buildUrlWithRequestId } from "@lib/utils";
import { useTranslation } from "@i18n/client";
import { MethodOptionCard } from "@components/mfa/MethodOptionCard";
import { Button } from "@components/ui/button/Button";

type Props = {
  checkAfter: boolean;
  requestId?: string;
  force?: boolean;
};

export function ChooseSecondFactorToSetup({ checkAfter, requestId }: Props) {
  const router = useRouter();
  const { t } = useTranslation("mfa");
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [nextUrl, setNextUrl] = useState<string>("");

  const params = new URLSearchParams({});

  if (checkAfter) {
    params.append("checkAfter", "true");
  }

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
      <div className="grid w-full grid-cols-1 gap-5 pt-4">
        {/* Email - OTP_EMAIL (Default) */}
        {ENABLE_EMAIL_OTP && (
          <MethodOptionCard
            method="email"
            title={t("set.email.title")}
            icon="/img/email_24px.png"
            description={t("set.email.description")}
            url={
              buildUrlWithRequestId("/otp/email/set", requestId) +
              (params.toString() ? (requestId ? "&" : "?") + params : "")
            }
            isSelected={selectedMethod === "email"}
            isDefault={true}
            defaultText={t("set.byDefault")}
            onSelect={handleMethodSelect}
          />
        )}

        {/* Authentication App - TOTP */}
        <MethodOptionCard
          method="authenticator"
          title={t("set.authenticator.title")}
          icon="/img/verified_user_24px.png"
          description={t("set.authenticator.description")}
          url={
            buildUrlWithRequestId("/otp/time-based/set", requestId) +
            (params.toString() ? (requestId ? "&" : "?") + params : "")
          }
          isSelected={selectedMethod === "authenticator"}
          onSelect={handleMethodSelect}
        />

        {/* Security Key - U2F */}
        <MethodOptionCard
          method="securityKey"
          title={t("set.securityKey.title")}
          icon="/img/fingerprint_24px.png"
          description={t("set.securityKey.description")}
          url={
            buildUrlWithRequestId("/u2f/set", requestId) +
            (params.toString() ? (requestId ? "&" : "?") + params : "")
          }
          isSelected={selectedMethod === "securityKey"}
          onSelect={handleMethodSelect}
        />
      </div>

      <div className="mt-8 flex justify-start">
        <Button theme="primary" disabled={!selectedMethod} onClick={handleContinue}>
          {t("set.continue") || "Continue"}
        </Button>
      </div>
    </>
  );
}
