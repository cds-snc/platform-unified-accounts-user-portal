"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import Link from "next/link";
import { createPortal } from "react-dom";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { buildUrlWithRequestId } from "@lib/utils";
import { I18n } from "@i18n";
import { LinkButton } from "@components/ui/button/LinkButton";

// Actions to be rendered outside of the auth panel, in the document body.
export const Actions = ({ requestId }: { requestId?: string }) => {
  const containerEl =
    typeof document === "undefined" ? null : document.getElementById("outside-auth-container");

  if (!containerEl) {
    return null;
  }

  const register = buildUrlWithRequestId("/register", requestId);
  const signIn = buildUrlWithRequestId("/", requestId);

  return createPortal(
    <div className="mt-10 flex items-center justify-center">
      <div className="flex flex-col items-center justify-center gap-4">
        <LinkButton.Primary href={register} className="">
          <I18n
            i18nKey="cta.createAccount"
            namespace="beforeYouStart"
            tagName="div"
            className="mb-1 text-base"
          />
        </LinkButton.Primary>

        <Link href={signIn} className="">
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
