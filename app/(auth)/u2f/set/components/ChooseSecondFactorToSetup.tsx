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
import { useTranslation } from "@i18n/client";
import { MethodOptionCard } from "@components/mfa/MethodOptionCard";
import { Button } from "@components/ui/button/Button";

type Props = {
  checkAfter: boolean;
  requestId?: string;
  force?: boolean;
  userMethods: AuthenticationMethodType[];
};

export function ChooseSecondFactorToSetup({ checkAfter, requestId, userMethods }: Props) {
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
      <div id="mfa-select" className="grid w-full grid-cols-1 gap-5 pt-4">
        {/* Authentication App - TOTP */}
        {!userMethods.includes(AuthenticationMethodType.TOTP) && (
          <MethodOptionCard
            method="authenticator"
            dataTestId="mfa-setup-authenticator"
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
        )}

        {/* Security Key - U2F */}
        <MethodOptionCard
          method="securityKey"
          dataTestId="mfa-setup-security-key"
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
        <Button
          id="mfa-continue"
          dataTestId="mfa-setup-continue"
          theme="primary"
          disabled={!selectedMethod}
          onClick={handleContinue}
        >
          {t("set.continue") || "Continue"}
        </Button>
      </div>
    </>
  );
}
