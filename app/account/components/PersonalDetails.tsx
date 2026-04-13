"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { useActionState, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useTranslation } from "react-i18next";

import { cn } from "@lib/utils";
/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { validatePersonalDetails } from "@lib/validationSchemas";
import { getError, hasError } from "@lib/validators";
import { Button } from "@components/ui/button/Button";
import { SubmitButtonAction } from "@components/ui/button/SubmitButton";
import { Label, TextInput } from "@components/ui/form";
import { ErrorMessage } from "@components/ui/form/ErrorMessage";
import { toast, ToastContainer } from "@components/ui/toast/Toast";

/*--------------------------------------------*
 * Parent Relative
 *--------------------------------------------*/
import { updatePersonalDetailsAction } from "../actions";

type FormState = {
  error?: string;
  validationErrors?: { fieldKey: string; fieldValue: string }[];
  formData?: {
    firstname?: string;
    lastname?: string;
    email?: string;
  };
};

export const PersonalDetails = ({
  userId,
  firstName,
  lastName,
  className,
}: {
  userId: string;
  firstName: string;
  lastName: string;
  className?: string;
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
          fieldValue: t(`personalDetails.validation.${issue.message}`),
        })),
        formData: formEntries,
      };
    }

    const result = await updatePersonalDetailsAction({
      userId,
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

  const [state, formAction] = useActionState(localFormAction, {
    validationErrors: undefined,
    formData: {
      firstname: firstName || "",
      lastname: lastName || "",
    },
  });

  return (
    <>
      <div className={cn("rounded-2xl border-3 border-highlight bg-white p-6", className)}>
        <div className="flex items-center justify-between">
          <h3 id="personal-details-title" className="mb-6">
            {t("personalDetails.title")}
          </h3>
          <div>
            <Button
              theme="primary"
              onClick={() => setEditMode(!editMode)}
              aria-describedby="personal-details-title"
              aria-expanded={editMode}
              aria-controls="personal-details-form"
              disabled={editMode}
              buttonRef={changeButtonRef}
            >
              {t("personalDetails.change")}
            </Button>
          </div>
        </div>
        {!editMode && (
          <div>
            <ul className="list-none p-0">
              <li className="mb-4">
                <div className="mb-1 font-semibold">{t("personalDetails.firstName")}</div>
                <div>
                  <em>{firstName}</em>
                </div>
              </li>
              <li className="mb-4">
                <div className="mb-1 font-semibold">{t("personalDetails.lastName")}</div>
                <div>
                  <em>{lastName}</em>
                </div>
              </li>
            </ul>
          </div>
        )}
        {editMode && (
          <form id="personal-details-form" action={formAction} onKeyDown={handleEscape} noValidate>
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
            <div className="flex gap-4">
              {/* Could also specify the first and or last name being updated but this is probably clear enough */}
              <SubmitButtonAction ariaDescribedBy="personal-details-title">
                {t("personalDetails.updateAccount")}
              </SubmitButtonAction>
              <Button theme="secondary" onClick={handleEditModeClose}>
                {t("personalDetails.cancel")}
              </Button>
            </div>
          </form>
        )}
      </div>
      <ToastContainer autoClose={false} containerId="account-details" />
    </>
  );
};
