/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getError, hasError } from "@lib/validation/validators";
import { useTranslation } from "@i18n";

/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/
import { ErrorMessage } from "./ErrorMessage";
import { Hint } from "./Hint";
import { Label } from "./Label";
import { TextInput } from "./TextInput";
type FormState = {
  error?: string;
  validationErrors?: { fieldKey: string; fieldValue: string }[];
  formData?: Record<string, string>;
};

export const CodeEntry = ({
  state,
  code,
  className,
}: {
  state: FormState;
  code?: string;
  className?: string;
}) => {
  const { t } = useTranslation("verify");
  return (
    <div className={className}>
      <div className="gcds-input-wrapper">
        <Label htmlFor="code" required>
          {t("label")}
        </Label>
        <Hint id="codeHint">{t("hint")}</Hint>
        {hasError("code", state.validationErrors) && (
          <ErrorMessage id={"errorMessageCode"}>
            {getError("code", state.validationErrors)}
          </ErrorMessage>
        )}
        <TextInput
          type="text"
          id="code"
          defaultValue={state.formData?.code ?? code ?? ""}
          autoComplete="one-time-code"
          ariaDescribedbyIds={
            hasError("code", state.validationErrors)
              ? ["errorMessageCode", "hint-codeHint"]
              : "hint-codeHint"
          }
          className="!w-36"
          required
          invalid={hasError("code", state.validationErrors)}
        />
      </div>
    </div>
  );
};
