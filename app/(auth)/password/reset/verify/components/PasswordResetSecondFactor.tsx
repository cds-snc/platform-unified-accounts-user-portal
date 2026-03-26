"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { useState } from "react";
import { useRouter } from "next/navigation";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { useTranslation } from "@i18n/client";
import { Button } from "@components/ui/button/Button";

/*--------------------------------------------*
 * Parent Relative
 *--------------------------------------------*/
import { MethodOptionCard } from "../../../../u2f/components/MethodOptionCard";

type Props = {
  canUseTotp: boolean;
  canUseU2F: boolean;
};

export function PasswordResetSecondFactor({ canUseTotp, canUseU2F }: Props) {
  const router = useRouter();
  const { t } = useTranslation("mfa");
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [nextUrl, setNextUrl] = useState<string>("");

  const handleMethodSelect = (method: string, url: string) => {
    setSelectedMethod(method);
    setNextUrl(url);
  };

  return (
    <>
      <div className="grid w-full grid-cols-1 gap-5 pt-4">
        {canUseTotp && (
          <MethodOptionCard
            method="authenticator"
            title={t("set.authenticator.title")}
            icon="/img/verified_user_24px.png"
            description={t("set.authenticator.description")}
            url="/password/reset/verify/time-based"
            isSelected={selectedMethod === "authenticator"}
            onSelect={handleMethodSelect}
          />
        )}
        {canUseU2F && (
          <MethodOptionCard
            method="securityKey"
            title={t("set.securityKey.title")}
            icon="/img/fingerprint_24px.png"
            description={t("set.securityKey.description")}
            url="/password/reset/verify/u2f"
            isSelected={selectedMethod === "securityKey"}
            onSelect={handleMethodSelect}
          />
        )}
      </div>

      <div className="mt-8 flex justify-start">
        <Button theme="primary" disabled={!selectedMethod} onClick={() => router.push(nextUrl)}>
          {t("set.continue")}
        </Button>
      </div>
    </>
  );
}
