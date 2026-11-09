"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { useActionState, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { validatePersonalDetails } from "@lib/validation/validationSchemas";
import {
  getError,
  hasError,
  translateValidationErrors,
  type ValidationErrorKey,
} from "@lib/validation/validators";
import { useTranslation } from "@i18n";
import { Button } from "@components/ui/button/Button";
import { SubmitButtonAction } from "@components/ui/button/SubmitButton";
import { Label, TextInput } from "@components/ui/form";
import { ErrorMessage } from "@components/ui/form/ErrorMessage";
import { toast, ToastContainer } from "@components/ui/toast/Toast";

import { logoutAndRegister } from "../actions";
/*--------------------------------------------*
 * Parent Relative
 *--------------------------------------------*/
import { updatePersonalDetailsAction } from "../actions";

type FormState = {
  error?: string;
  validationErrors?: ValidationErrorKey[];
  formData?: {
    firstname?: string;
    lastname?: string;
    email?: string;
  };
};

export const PersonalDetails = ({
  firstName,
  lastName,
  email,
}: {
  firstName: string;
  lastName: string;
  email: string;
}) => {
  const { t } = useTranslation("account");
  const [editMode, setEditMode] = useState(false);
  const firstNameRef = useRef<HTMLInputElement>(null);
  const changeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (editMode) {
      firstNameRef.current?.focus();
    }
  }, [editMode]);

  const handleEditModeClose = () => {
    // wait for React to flush state (closing the form) before moving focus back to the
    // change button to prevent focus conflicts
    flushSync(() => setEditMode(false));
    changeButtonRef.current?.focus();
  };

  const handleEscape = (e: React.KeyboardEvent) => {
    // Treat like a dialog with escape "closing" edit mode
    if (e.key === "Escape") {
      handleEditModeClose();
    }
  };

  const localFormAction = async (_: FormState, formData: FormData) => {
    const formEntries = {
      firstname: (formData.get("firstname") as string) || "",
      lastname: (formData.get("lastname") as string) || "",
    };

    const formEntriesData = Object.fromEntries(formData.entries());
    const validationResult = await validatePersonalDetails(formEntriesData);
    if (!validationResult.success) {
      return {
        validationErrors: validationResult.issues.map((issue) => ({
          fieldKey: issue.path?.[0].key as string,
          errorKey: `personalDetails.validation.${issue.message}`,
        })),
        formData: formEntries,
      };
    }

    const result = await updatePersonalDetailsAction({
      firstName: formEntries.firstname,
      lastName: formEntries.lastname,
    });

    if ("error" in result) {
      toast.error(result.error || t("personalDetails.errors.updateFailed"), "account-details");
      return {
        formData: formEntries,
      };
    }

    toast.success(t("personalDetails.success.updateSuccess"), "account-details");
    handleEditModeClose();
    return {
      formData: formEntries,
    };
  };

  const [rawState, formAction] = useActionState(localFormAction, {
    validationErrors: undefined,
    formData: {
      firstname: firstName || "",
      lastname: lastName || "",
    },
  });

  const state = {
    ...rawState,
    validationErrors: translateValidationErrors(rawState.validationErrors, t),
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h3 id="personal-details-title" className="mb-4">
          {t("personalDetails.title")}
        </h3>
      </div>
      <div className="mb-6">
        {!editMode && (
          <div className="flex flex-row">
            <ul className="grow list-none p-0">
              <li className="mb-2">
                <div className="mb-1 font-bold">{t("personalDetails.firstName")}</div>
                <div>
                  <em data-testid="first-name">{firstName}</em>
                </div>
              </li>
              <li>
                <div className="mb-1 font-bold">{t("personalDetails.lastName")}</div>
                <div>
                  <em data-testid="last-name">{lastName}</em>
                </div>
              </li>
            </ul>
            <div className="flex flex-col">
              <Button
                theme="primary"
                onClick={() => setEditMode(!editMode)}
                aria-describedby="personal-details-title"
                aria-expanded={editMode}
                aria-controls="personal-details-form"
                disabled={editMode}
                buttonRef={changeButtonRef}

                dataTestId="account-name-change"
              >
                {t("personalDetails.change")}
              </Button>
            </div>
          </div>
        )}
        {editMode && (
          <form
            id="personal-details-form"
            action={formAction}
            onKeyDown={handleEscape}
            noValidate
            className="flex flex-row gap-4"
          >
            <fieldset className="grow">
              <legend className="sr-only">{t("personalDetails.updateDetails")}</legend>
              <div className="mb-4 flex flex-col gap-4">
                <div className="gcds-input-wrapper">
                  <Label className="required" htmlFor="firstname" required>
                    {t("personalDetails.firstName")}
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
                    ref={firstNameRef}
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
                    {t("personalDetails.lastName")}
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
                      hasError("lastname", state.validationErrors)
                        ? ["errorMessageLastname"]
                        : undefined
                    }
                    invalid={hasError("lastname", state.validationErrors)}
                  />
                </div>
              </div>
            </fieldset>
            <div className="basis-1/3">
              <div className="float-right">
                {/* Could also specify the first and or last name being updated but this is probably clear enough */}
                <SubmitButtonAction ariaDescribedBy="personal-details-title">
                  {t("personalDetails.updateAccount")}
                </SubmitButtonAction>
              </div>
            </div>
          </form>
        )}
      </div>
      <div className="mb-6 flex flex-col gap-4">
        <div>
          <h3 className="mb-4">{t("personalDetails.email")}</h3>
          <div>
            <em data-testid="account-email">{email}</em>
          </div>
        </div>
        <div>
          <div className="mb-1 font-bold">{t("personalDetails.cannotBeChanged")}</div>

          <Button theme="link" onClick={logoutAndRegister} dataTestId="account-create-new">
            {t("personalDetails.createNewAccount")}
          </Button>
        </div>
      </div>
      <ToastContainer autoClose={false} containerId="account-details" />
    </>
  );
};
