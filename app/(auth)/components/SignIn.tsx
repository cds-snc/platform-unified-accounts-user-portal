"use client";
/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { Cookie } from "@lib/cookies";
import { buildUrlWithRequestId } from "@lib/utils";
import { useTranslation } from "@i18n";
import { ToastContainer } from "@components/ui/toast/Toast";
import { toast } from "@components/ui/toast/Toast";

import { checkActiveSession, continueOidcSessionSelection, setSession } from "../actions";

/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/
import { LoginForm } from "./LoginForm";
import { SessionSelect } from "./SessionSelect";

type SignInProps = {
  requestId?: string;
  registerLink: string;
  allSessions: Map<string, Cookie>;
};

export const SignIn = ({ requestId, registerLink, allSessions }: SignInProps) => {
  const { t } = useTranslation("start");
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedSession = searchParams.get("session");
  const selectedSessionQuery = (sessionId: string) =>
    `?session=${sessionId}${requestId ? `&requestId=${requestId}` : ""}`;

  const selectSession = async (sessionId: string) => {
    if (sessionId !== "other") {
      await setSession(sessionId);
      const isValidSession = await checkActiveSession();
      if (isValidSession) {
        if (requestId) {
          const { error } = await continueOidcSessionSelection(sessionId, requestId);
          if (error) {
            toast.error(error, "login-authentication");
            return;
          }

          // If no redirect is provided, redirect to the selected session page
          return router.push(selectedSessionQuery(sessionId));
        }

        // If no requestId is provided, redirect to the account page
        return router.push(buildUrlWithRequestId("/account", requestId));
      }
    }
    // Used to set state on the page not as the result of a mutation action
    router.push(selectedSessionQuery(sessionId));
  };

  return (
    <>
      {selectedSession || allSessions.size === 0 ? (
        <LoginForm
          requestId={requestId}
          session={
            selectedSession && selectedSession !== "other"
              ? allSessions.get(selectedSession)
              : undefined
          }
        />
      ) : (
        <SessionSelect sessions={allSessions} selectSession={selectSession} />
      )}

      <p className="mt-10">
        {t("register")}
        &nbsp;
        <Link href={registerLink} prefetch={false} data-testid="register-link">
          {t("registerLinkText")}
        </Link>
        .
      </p>
      <ToastContainer autoClose={false} containerId="login-authentication" />
    </>
  );
};
