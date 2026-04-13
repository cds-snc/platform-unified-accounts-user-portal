"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import React, { type JSX, ReactElement, RefObject } from "react";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { cn } from "@lib/utils";
import { useTranslation } from "@i18n/client";
import { SpinnerIcon } from "@components/icons/SpinnerIcon";

/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/
import { Theme, themes } from "./themes";
interface ButtonProps {
  type?: "button" | "submit" | "reset";
  children?: JSX.Element | string;
  id?: string;
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
  icon?: ReactElement;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
  theme?: Theme;
  tabIndex?: number;
  buttonRef?: RefObject<HTMLButtonElement | null>;
  dataTestId?: string;
  loading?: boolean;
}

export const Button = ({
  type = "button",
  children,
  onClick,
  className,
  icon,
  disabled = false,
  "aria-label": ariaLabel = undefined,
  theme = "primary",
  tabIndex, // Note: a button should already be in the tab-index rotor. Only add for specific cases.
  buttonRef,
  dataTestId,
  loading = false,
  ...rest
}: ButtonProps & React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  const { t } = useTranslation("common");

  const disabledGreyClass = `
    focus:bg-[#e2e8ef] focus:text-[#748094] focus:border-none focus:outline-offset-0 focus:outline-0
    active:bg-[#e2e8ef] active:text-[#748094] active:border-none active:outline-offset-0 active:outline-0
  `;

  return (
    <button
      type={type}
      onClick={onClick}
      className={
        loading
          ? cn(themes["base"], themes.disabled, disabledGreyClass)
          : cn(themes["base"], themes[theme], className)
      }
      disabled={disabled}
      aria-label={ariaLabel}
      {...(tabIndex && { tabIndex })}
      data-testid={dataTestId}
      ref={buttonRef}
      {...rest}
    >
      {icon && <div className={cn(theme !== "icon" && "mr-2 -ml-2 w-8")}>{icon}</div>}
      {children}

      {loading && (
        <SpinnerIcon className="ml-2 size-7 animate-spin fill-blue-600 text-white dark:text-white" />
      )}
      <div aria-live="polite" className="sr-only">
        {loading && `${t("loadingResult")}`}
      </div>
    </button>
  );
};

export const RoundedButton = ({ className, ...props }: ButtonProps) => (
  <Button {...props} className={cn(className, "rounded-[100px]")} />
);
