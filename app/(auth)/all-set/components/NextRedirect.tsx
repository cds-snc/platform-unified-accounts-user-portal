"use client";
import { useTranslation } from "@i18n";
import { Button } from "@components/ui/button/Button";

import { nextRedirect } from "../action";
export const NextReditect = () => {
  const { t } = useTranslation("allSet");
  return (
    <div>
      <Button onClick={nextRedirect}>{t("continueButton")}</Button>
    </div>
  );
};
