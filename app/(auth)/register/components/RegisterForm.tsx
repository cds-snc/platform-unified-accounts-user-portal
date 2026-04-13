"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { useActionState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getSiteLink, SiteConfig } from "@lib/site-config";
import { buildUrlWithRequestId } from "@lib/utils";
import { validateAccount } from "@lib/validationSchemas";
import { getError, hasError } from "@lib/validators";
import { useTranslation } from "@i18n";
import { SubmitButtonAction } from "@components/ui/button/SubmitButton";
import { Label, TextInput } from "@components/ui/form";
import { ErrorMessage } from "@components/ui/form/ErrorMessage";
import { ErrorSummary } from "@components/ui/form/ErrorSummary";
import { Hint } from "@components/ui/form/Hint";

/*--------------------------------------------*
 * Parent Relative
 *--------------------------------------------*/
import { useRegistration } from "../context/RegistrationContext";

type FormState = {
  error?: string;
  validationErrors?: { fieldKey: string; fieldValue: string }[];
  formData?: {
    firstname?: string;
    lastname?: string;
    email?: string;
  };
};

type Props = {
  organization: string;
  requestId?: string;
  siteConfig: SiteConfig;
};

export function RegisterForm({ organization, requestId, siteConfig }: Props) {
  const { t, i18n } = useTranslation(["register", "validation", "errorSummary", "common"]);
  const termsOfUseLink = getSiteLink(siteConfig, "termsOfUse", i18n.language);
  const { setRegistrationData } = useRegistration();
  const router = useRouter();

  const localFormAction = async (previousState: FormState, formData: FormData) => {
    const formEntries = {
      firstname: (formData.get("firstname") as string) || "",
      lastname: (formData.get("lastname") as string) || "",
      email: (formData.get("email") as string) || "",
    };

    // Validate form entries and map any errors to form state with translated messages
    const formEntriesData = Object.fromEntries(formData.entries());
    const validationResult = await validateAccount(formEntriesData);
    if (!validationResult.success) {
      return {
        validationErrors: validationResult.issues.map((issue) => ({
          fieldKey: issue.path?.[0].key as string,
          fieldValue: t(`validation.${issue.message}`),
        })),
        formData: formEntries,
      };
    }

    // Store registration data in context (persisted to sessionStorage)
    setRegistrationData({
      ...validationResult.output,
      ...(organization && { organization }),
      ...(requestId && { requestId }),
    });
    router.push(buildUrlWithRequestId("/register/password", requestId));

    return previousState;
  };

  const [state, formAction] = useActionState(localFormAction, {
    validationErrors: undefined,
    formData: {
      firstname: "",
      lastname: "",
      email: "",
    },
  });

  return (
    <>
      <ErrorSummary id="errorSummary" validationErrors={state.validationErrors} />
      <form action={formAction} noValidate>
        <div className="mb-4 flex flex-col gap-4">
          <div className="gcds-input-wrapper">
            <Label className="required" htmlFor="firstname" required>
              {t("labels.firstname")}
            </Label>
            {hasError("firstname", state.validationErrors) && (
              <ErrorMessage id={"errorMessageFirstname"}>
                {getError("firstname", state.validationErrors)}
              </ErrorMessage>
            )}
            <TextInput
              className="w-full"
              type="text"
              id="firstname"
              autoComplete="given-name"
              required
              defaultValue={state.formData?.firstname ?? ""}
              ariaDescribedbyIds={
                hasError("firstname", state.validationErrors)
                  ? ["errorMessageFirstname"]
                  : undefined
              }
              invalid={hasError("firstname", state.validationErrors)}
            />
          </div>
          <div className="gcds-input-wrapper">
            <Label htmlFor="lastname" required>
              {t("labels.lastname")}
            </Label>
            {hasError("lastname", state.validationErrors) && (
              <ErrorMessage id={"errorMessageLastname"}>
                {getError("lastname", state.validationErrors)}
              </ErrorMessage>
            )}
            <TextInput
              className="w-full"
              type="text"
              autoComplete="family-name"
              required
              id="lastname"
              defaultValue={state.formData?.lastname ?? ""}
              ariaDescribedbyIds={
                hasError("lastname", state.validationErrors) ? ["errorMessageLastname"] : undefined
              }
              invalid={hasError("lastname", state.validationErrors)}
            />
          </div>
          <div className="gcds-input-wrapper col-span-2">
            <Label htmlFor="email" required>
              {t("labels.email")}
            </Label>
            <Hint id="email-hint">{t("emailInputHint")}</Hint>
            {hasError("email", state.validationErrors) && (
              <ErrorMessage id={"errorMessageEmail"}>
                {getError("email", state.validationErrors)}
              </ErrorMessage>
            )}
            <TextInput
              className="w-full"
              type="email"
              autoComplete="email"
              required
              id="email"
              defaultValue={state.formData?.email ?? ""}
              ariaDescribedbyIds={
                hasError("email", state.validationErrors)
                  ? ["errorMessageEmail", "hint-email-hint"]
                  : "hint-email-hint"
              }
              invalid={hasError("email", state.validationErrors)}
            />
          </div>
        </div>

        {termsOfUseLink && (
          <p className="-mt-2 mb-10">
            {t("terms.agreement")}
            <Link href={termsOfUseLink}>{t("terms.linkText")}</Link>
          </p>
        )}

        <div>
          <SubmitButtonAction>{t("button.continue", { ns: "common" })}</SubmitButtonAction>
        </div>
      </form>
    </>
  );
}
