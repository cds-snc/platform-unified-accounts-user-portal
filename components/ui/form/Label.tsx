/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import React from "react";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { cn } from "@lib/utils";
import { I18n } from "@i18n";
interface LabelProps {
  children: React.ReactNode;
  htmlFor?: string;
  id?: string;
  className?: string;
  error?: boolean;
  hint?: React.ReactNode;
  srOnly?: boolean;
  required?: boolean;
  group?: boolean;
}

export const Label = (props: LabelProps): React.ReactElement => {
  const { children, htmlFor, className, error, hint, srOnly, required, id, group } = props;

  const classes = cn(
    {
      "gcds-label": !srOnly,
      "gc-sr-only": srOnly,
      "gcds-label--error": error,
    },
    className
  );

  const childrenElements = (
    <>
      {children}
      {required && (
        <span className="label--required">
          {"("}
          <I18n data-testid="required" aria-hidden i18nKey="required" />
          {")"}
        </span>
      )}

      {hint && hint}
    </>
  );

  return group ? (
    <legend data-testid="label" className={classes} id={id}>
      {childrenElements}
    </legend>
  ) : (
    <label data-testid="label" className={classes} htmlFor={htmlFor} id={id}>
      {childrenElements}
    </label>
  );
};
