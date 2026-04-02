/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
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

// Pulls the error keys out of form state. Note that the validationErrors must be
// populated with the translated strings for this to work.
const getError = (fieldKey: string, state: FormState) => {
  return state.validationErrors?.find((e) => e.fieldKey === fieldKey)?.fieldValue || "";
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
        {getError("code", state) && (
          <ErrorMessage id={"errorMessageCode"}>{getError("code", state)}</ErrorMessage>
        )}
        <TextInput
          type="text"
          id="code"
          defaultValue={state.formData?.code ?? code ?? ""}
          autoComplete="one-time-code"
          ariaDescribedbyIds={
            getError("code", state) ? ["errorMessageCode", "codeHint"] : "codeHint"
          }
          className="!w-36"
          required
          invalid={!!getError("code", state)}
        />
      </div>
    </div>
  );
};
