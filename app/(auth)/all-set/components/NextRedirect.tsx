"use client";

import { useTranslation } from "@i18n";
import { useRequestingApp } from "@components/contexts/RequestingAppContext";
import { Button } from "@components/ui/button/Button";

import { nextRedirect } from "../action";
export const NextReditect = () => {
  const { t } = useTranslation("allSet");
  const { requestingAppName } = useRequestingApp();

  return (
    <div>
      <Button dataTestId="continue-button" onClick={nextRedirect}>
        {t("continueButton", { app: requestingAppName })}
      </Button>
    </div>
  );
};
