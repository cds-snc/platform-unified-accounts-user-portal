"use client";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { buildUrlWithRequestId } from "@lib/utils";
import { useTranslation } from "@i18n";
import { Button } from "@components/ui/button/Button";
import { LinkButton } from "@components/ui/button/LinkButton";

import { useRegistration } from "../../../context/RegistrationContext";

// Actions to be rendered outside of the auth panel, in the document body.
export const Actions = ({ requestId }: { requestId?: string }) => {
  const { setAcceptedTerms } = useRegistration();
  const { t } = useTranslation("acceptTOU");

  const handleClick = () => {
    setAcceptedTerms(true);
  };

  const cancel = buildUrlWithRequestId("/", requestId);

  return (
    <div className="mt-10">
      <div className="flex flex-row items-center gap-4">
        <LinkButton.Secondary href={cancel} className="">
          {t("cancel")}
        </LinkButton.Secondary>
        <Button className="" type="submit" theme="primary" onClick={() => handleClick()}>
          {t("continue")}
        </Button>
      </div>
    </div>
  );
};
