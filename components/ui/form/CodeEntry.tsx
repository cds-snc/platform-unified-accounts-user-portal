/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getError, hasError } from "@lib/validators";
import { I18n } from "@i18n";

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
  return (
    <div className={className}>
      <div className="gcds-input-wrapper">
        <Label htmlFor="code" required>
          <I18n i18nKey="label" namespace="verify" />
        </Label>
        <Hint id="codeHint">
          <I18n i18nKey="hint" namespace="verify" />
        </Hint>
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
            hasError("code", state.validationErrors) ? ["errorMessageCode", "codeHint"] : "codeHint"
          }
          className="!w-36"
          required
          invalid={hasError("code", state.validationErrors)}
        />
      </div>
    </div>
  );
};
