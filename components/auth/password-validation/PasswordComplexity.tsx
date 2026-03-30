/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { useEffect, useReducer } from "react";
import { PasswordComplexitySettings } from "@zitadel/proto/zitadel/settings/v2/password_settings_pb";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import {
  lowerCaseValidator,
  numberValidator,
  symbolValidator,
  upperCaseValidator,
} from "@lib/validators";
import { I18n } from "@i18n";

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="text-green-500 dark:text-green-500 mr-2 size-6 flex-none text-lg"
      // Update announced to SR in validation instead
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg
      className="mr-2 size-6 flex-none text-lg"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      // Update announced to SR in validation instead
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function renderIcon(matched: boolean) {
  return matched ? <CheckIcon /> : <CrossIcon />;
}
const desc = "text-14px leading-4 text-input-light-label dark:text-input-dark-label";

function useDelayedUpdate(allValid: boolean, delay: number) {
  // Avoid any synchronous state issues with setting state in the useEffect by using a reducer
  const [showDelayed, dispatch] = useReducer(
    (_state: boolean, action: { type: "show" | "hide" }) => action.type === "show",
    false
  );
  useEffect(() => {
    if (!allValid) {
      dispatch({ type: "hide" });
      return;
    }
    const timer = setTimeout(() => dispatch({ type: "show" }), delay);
    return () => clearTimeout(timer);
  }, [allValid, delay]);
  return showDelayed;
}

export function PasswordComplexity({
  passwordComplexitySettings,
  password,
  id,
  ready,
  // equals,
}: {
  passwordComplexitySettings: PasswordComplexitySettings;
  password: string;
  id: string;
  ready: boolean;
  // equals?: boolean;
}) {
  const hasMinLength = password?.length >= passwordComplexitySettings.minLength;
  const hasSymbol = symbolValidator(password);
  const hasNumber = numberValidator(password);
  const hasUppercase = upperCaseValidator(password);
  const hasLowercase = lowerCaseValidator(password);

  // Make sure the "valid password" message is queued after the other success messsages
  const allValid = ready && hasMinLength && hasNumber && hasUppercase && hasLowercase && hasSymbol;
  const announceSuccess = useDelayedUpdate(allValid, 100);

  // TODO should the passwordComplexitySettings be the "source of truth" for all validation that is done or not done?
  return (
    <>
      <ol id={id} className="mb-4 pl-0">
        {passwordComplexitySettings.minLength && (
          <li className="mb-2 flex flex-row items-center" data-testid="length-check">
            {renderIcon(hasMinLength)}
            <span className={desc}>
              <I18n
                i18nKey="complexity.minLength"
                namespace="password"
                data={{ minLength: passwordComplexitySettings.minLength.toString() }}
              />
            </span>
            <span aria-live="polite" aria-atomic="true" className="sr-only">
              {ready && hasMinLength && (
                <>
                  <I18n i18nKey="complexity.success" namespace="password" />
                  <I18n i18nKey="complexity.minLength" namespace="password" />
                </>
              )}
            </span>
          </li>
        )}
        <li className="mb-2 flex flex-row items-center" data-testid="number-check">
          {renderIcon(hasNumber)}
          <span className={desc}>
            <I18n i18nKey="complexity.hasNumber" namespace="password" />
          </span>
          <span aria-live="polite" aria-atomic="true" className="sr-only">
            {ready && hasNumber && (
              <>
                <I18n i18nKey="complexity.success" namespace="password" />
                <I18n i18nKey="complexity.hasNumber" namespace="password" />
              </>
            )}
          </span>
        </li>
        <li className="mb-2 flex flex-row items-center" data-testid="uppercase-check">
          {renderIcon(hasUppercase)}
          <span className={desc}>
            <I18n i18nKey="complexity.hasUppercase" namespace="password" />
          </span>
          <span aria-live="polite" aria-atomic="true" className="sr-only">
            {ready && hasUppercase && (
              <>
                <I18n i18nKey="complexity.success" namespace="password" />
                <I18n i18nKey="complexity.hasUppercase" namespace="password" />
              </>
            )}
          </span>
        </li>
        <li className="mb-2 flex flex-row items-center" data-testid="lowercase-check">
          {renderIcon(hasLowercase)}
          <span className={desc}>
            <I18n i18nKey="complexity.hasLowercase" namespace="password" />
          </span>
          <span aria-live="polite" aria-atomic="true" className="sr-only">
            {ready && hasLowercase && (
              <>
                <I18n i18nKey="complexity.success" namespace="password" />
                <I18n i18nKey="complexity.hasLowercase" namespace="password" />
              </>
            )}
          </span>
        </li>
        <li className="mb-2 flex flex-row items-center" data-testid="symbol-check">
          {renderIcon(hasSymbol)}
          <span className={desc}>
            <I18n i18nKey="complexity.hasSymbol" namespace="password" />
          </span>
          <span aria-live="polite" aria-atomic="true" className="sr-only">
            {ready && hasSymbol && (
              <>
                <I18n i18nKey="complexity.success" namespace="password" />
                <I18n i18nKey="complexity.hasSymbol" namespace="password" />
              </>
            )}
          </span>
        </li>

        {/* <li className="flex flex-row items-center" data-testid="equal-check">
          {renderIcon(equals, t)}
          <span className={desc}>
            <I18n i18nKey="complexity.equals" namespace="password" />
          </span>
          <span aria-live="polite" aria-atomic="true" className="sr-only">
            {equals
              ? t("complexity.succeeds", { ns: "password" })
              : t("complexity.fails", { ns: "password" })}{" "}
            {t("complexity.equals", { ns: "password" })}
          </span>
        </li> */}
      </ol>
      <span aria-live="polite" aria-atomic="true" className="sr-only">
        {announceSuccess && (
          <I18n i18nKey="complexity.requiredPasswordSuccess" namespace="password" />
        )}
      </span>
    </>
  );
}
