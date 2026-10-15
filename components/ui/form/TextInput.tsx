/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import React from "react";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { cn } from "@lib/utils";
export const TextInput = ({
  id,
  type,
  className,
  required,
  placeholder,
  autoComplete,
  spellCheck,
  ariaDescribedbyIds,
  onChange,
  dataTestId = "textInput",
  defaultValue = "",
  ref,
  invalid,
  readonly,
}: {
  id: string;
  type: string;
  className?: string;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
  spellCheck?: boolean;
  ariaDescribedbyIds?: string[] | string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  dataTestId?: string;
  defaultValue?: string;
  ref?: React.Ref<HTMLInputElement>;
  invalid?: boolean;
  readonly?: boolean;
}): React.ReactElement => {
  const classes = cn("gc-input-text", className, readonly && "bg-gcds-grayscale-100!");

  return (
    <>
      <input
        data-testid={dataTestId}
        className={classes}
        id={id}
        name={id}
        type={type}
        required={required}
        autoComplete={autoComplete || "off"}
        spellCheck={spellCheck}
        placeholder={placeholder}
        defaultValue={defaultValue}
        onChange={onChange}
        {...(ariaDescribedbyIds && {
          "aria-describedby": Array.isArray(ariaDescribedbyIds)
            ? ariaDescribedbyIds.join(" ")
            : ariaDescribedbyIds,
        })}
        ref={ref}
        {...(invalid !== undefined && { "aria-invalid": invalid })}
        {...(readonly && { readOnly: true })}
      />
    </>
  );
};
