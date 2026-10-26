/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { useEffect, useRef, useState } from "react";
import { PasswordComplexitySettings } from "@zitadel/proto/zitadel/settings/v2/password_settings_pb";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import {
  lowerCaseValidator,
  numberValidator,
  symbolValidator,
  upperCaseValidator,
} from "@lib/validation/validators";
import { useTranslation } from "@i18n";

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

export function PasswordComplexity({
  passwordComplexitySettings,
  password,
  id,
  ready,
}: {
  passwordComplexitySettings: PasswordComplexitySettings;
  password: string;
  id: string;
  ready: boolean;
}) {
  const { t } = useTranslation("password");
  const hasMinLength = password?.length >= passwordComplexitySettings.minLength;
  const hasSymbol = symbolValidator(password);
  const hasNumber = numberValidator(password);
  const hasUppercase = upperCaseValidator(password);
  const hasLowercase = lowerCaseValidator(password);

  const requirements = [
    {
      id: "length-check",
      label: t("complexity.minLength", { minLength: passwordComplexitySettings.minLength }),
      matched: hasMinLength,
      enabled: Boolean(passwordComplexitySettings.minLength),
    },
    { id: "number-check", label: t("complexity.hasNumber"), matched: hasNumber, enabled: true },
    {
      id: "uppercase-check",
      label: t("complexity.hasUppercase"),
      matched: hasUppercase,
      enabled: true,
    },
    {
      id: "lowercase-check",
      label: t("complexity.hasLowercase"),
      matched: hasLowercase,
      enabled: true,
    },
    { id: "symbol-check", label: t("complexity.hasSymbol"), matched: hasSymbol, enabled: true },
  ].filter((requirement) => requirement.enabled);
  const [announcement, setAnnouncement] = useState("");
  const lastAnnounced = useRef(requirements);

  useEffect(() => {
    if (!ready) {
      lastAnnounced.current = requirements;
      return;
    }

    const timer = setTimeout(() => {
      // Compare with the last announced state, not intermediate keystrokes.
      const changed = requirements.filter(
        (requirement) =>
          lastAnnounced.current.find((previous) => previous.id === requirement.id)?.matched !==
          requirement.matched
      );

      if (changed.length > 0) {
        setAnnouncement(
          requirements.every((requirement) => requirement.matched)
            ? t("complexity.allRequirementsMet")
            : changed
                .map((requirement) =>
                  t(
                    requirement.matched
                      ? "complexity.requirementMet"
                      : "complexity.requirementUnmet",
                    { requirement: requirement.label }
                  )
                )
                .join(" ")
        );
      }
      lastAnnounced.current = requirements;
    }, 400);

    return () => clearTimeout(timer);
    // Restart the debounce on every password change, even if statuses are unchanged.
  }, [password, ready, requirements, t]);

  return (
    <>
      <ol id={id} className="mb-4 pl-0">
        {requirements.map((requirement) => (
          <li
            key={requirement.id}
            className="mb-2 flex flex-row items-center"
            data-testid={requirement.id}
          >
            {renderIcon(requirement.matched)}
            <span className={desc}>{requirement.label}</span>
            <span className="sr-only">
              {" "}
              {t(requirement.matched ? "complexity.met" : "complexity.notMet")}
            </span>
          </li>
        ))}
      </ol>
      <div role="status" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </>
  );
}
