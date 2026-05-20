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

import { checkActiveSession, setSession } from "../actions";

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

  const selectSession = async (sessionId: string) => {
    if (sessionId !== "other") {
      await setSession(sessionId);
      const isValidSession = await checkActiveSession();
      if (isValidSession) {
        return router.push(buildUrlWithRequestId("/account", requestId));
      }
    }
    router.push(`?session=${sessionId}${requestId ? `&requestId=${requestId}` : ""}`);
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
        <Link href={registerLink}>{t("registerLinkText")}</Link>.
      </p>
    </>
  );
};
