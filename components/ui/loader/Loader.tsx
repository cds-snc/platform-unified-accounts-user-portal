/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import React from "react";

import { serverTranslation } from "@i18n/server";

interface LoaderProps {
  message?: string;
  className?: string;
}

export const Loader = async ({ message, className }: LoaderProps): Promise<React.ReactElement> => {
  const { t } = await serverTranslation();

  return (
    <div
      id="react-hydration-loader"
      data-testid="loading-spinner"
      role="status"
      className={className}
    >
      <div className="text-center">
        {message ? <p className="pb-8">{message}</p> : <p className="sr-only">{t("loading")}</p>}
        <div className="flex items-center justify-center">
          <div
            className="size-40 animate-spin rounded-full border-y-4 border-highlight motion-reduce:animate-none"
            aria-hidden="true"
          ></div>
        </div>
      </div>
    </div>
  );
};
