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
  ariaDescribedbyIds,
  onChange,
  defaultValue = "",
  ref,
  invalid,
}: {
  id: string;
  type: string;
  className?: string;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
  ariaDescribedbyIds?: string[] | string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  defaultValue?: string;
  ref?: React.Ref<HTMLInputElement>;
  invalid?: boolean;
}): React.ReactElement => {
  const classes = cn("gc-input-text", className);

  return (
    <>
      <input
        data-testid="textInput"
        className={classes}
        id={id}
        name={id}
        type={type}
        required={required}
        autoComplete={autoComplete ? autoComplete : "off"}
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
      />
    </>
  );
};
