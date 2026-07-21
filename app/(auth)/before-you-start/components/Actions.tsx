"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import Link from "next/link";
import { createPortal } from "react-dom";

import { I18n } from "@i18n";
/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { Button } from "@components/ui/button/Button";

// Actions to be rendered outside of the auth panel, in the document body.
export const Actions = () => {
  const containerEl =
    typeof document === "undefined" ? null : document.getElementById("outside-auth-container");

  if (!containerEl) {
    return null;
  }

  return createPortal(
    <div className="mt-10 flex items-center justify-center">
      <div className="flex flex-col items-center justify-center gap-4">
        <Button>
          <I18n
            i18nKey="cta.createAccount"
            namespace="beforeYouStart"
            tagName="div"
            className="mb-1 text-base"
          />
        </Button>

        <Link href="/auth/sign-in" className="text-gcds-gray-800 text-base underline">
          <I18n
            i18nKey="cta.alreadyHaveAccount"
            namespace="beforeYouStart"
            tagName="div"
            className="mb-1 text-base"
          />
        </Link>
      </div>
    </div>,
    containerEl
  );
};
