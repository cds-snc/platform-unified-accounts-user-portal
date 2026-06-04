"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { useActionState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";

import { validateTotpCode } from "@lib/client/validationSchemas";
/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getSafeErrorMessage } from "@lib/safeErrorMessage";
import { getZitadelUiError } from "@lib/zitadel-errors";
import { I18n, useTranslation } from "@i18n";
import { SubmitButtonAction } from "@components/ui/button/SubmitButton";
import { Alert, ErrorStatus, Label, TextInput } from "@components/ui/form";

import { verifiyAndRegisterTOTP } from "../set/actions";

/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/
import { CopyToClipboard } from "./CopyToClipboard";
type FormState = {
  error?: string;
};

type Props = {
  uri: string;
  secret: string;
  requestId?: string;
  checkAfter?: boolean;
};
export function TotpRegister({ uri, requestId, checkAfter }: Props) {
  const { t } = useTranslation(["otp", "error"]);
  const genericErrorMessage = t("set.genericError");
  const invalidCodeMessage = t("set.invalidCode");
  const invalidCodeLengthMessage = t("set.invalidCodeLength");

  const localFormAction = async (previousState: FormState, formData?: FormData) => {
    const code = formData?.get("code");

    if (typeof code !== "string") {
      return {
        error: genericErrorMessage,
      };
    }

    const normalizedCode = code.trim();

    const totpValidationResult = await validateTotpCode({ code: normalizedCode });
    if (!totpValidationResult.success) {
      return {
        error: invalidCodeLengthMessage,
      };
    }

    return verifiyAndRegisterTOTP({ code: normalizedCode, requestId, checkAfter })
      .then(() => {
        return previousState;
      })
      .catch((e) => {
        const mappedUiError = getZitadelUiError("otp.verify", e);
        if (mappedUiError) {
          return {
            error: t(mappedUiError.i18nKey),
          };
        }

        return {
          error: genericErrorMessage,
        };
      });
  };
  const [state, formAction, isPending] = useActionState(localFormAction, {});

  return (
    <div className="flex flex-col items-center">
      {uri && (
        <>
          <QRCodeSVG className="my-4 size-40 rounded-md bg-white p-2" value={uri} />
          <div className="my-2 mb-4 flex w-96 rounded-lg border px-4 py-2 pr-2 text-sm">
            <Link href={uri} target="_blank" className="flex-1 overflow-x-auto">
              {uri}
            </Link>
            <CopyToClipboard value={uri}></CopyToClipboard>
          </div>
          <form id="totp-form" className="w-full" action={formAction}>
            {!isPending && state.error && (
              <div className="py-4">
                <Alert type={ErrorStatus.ERROR} focussable>
                  {getSafeErrorMessage({
                    error: state.error,
                    fallback: genericErrorMessage,
                    allowedMessages: [
                      genericErrorMessage,
                      invalidCodeMessage,
                      invalidCodeLengthMessage,
                    ],
                  })}
                </Alert>
              </div>
            )}

            <div className="gcds-input-wrapper">
              <Label id={"label-code"} htmlFor={"code"} className="required" required>
                {t("set.labels.code")}
              </Label>
              <TextInput
                type={"text"}
                id={"code"}
                required
                defaultValue={""}
                autoComplete="one-time-code"
                invalid={!!state.error}
              />
            </div>

            <SubmitButtonAction>
              <I18n i18nKey="set.submit" namespace="otp" />
            </SubmitButtonAction>
          </form>
        </>
      )}
    </div>
  );
}
