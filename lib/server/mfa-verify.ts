import { redirect } from "next/navigation";

import { getSessionCredentials } from "@lib/cookies";
import { logMessage } from "@lib/logger";
import { loadSessionById, loadSessionByLoginname, type SessionWithAuthData } from "@lib/session";

import { AuthLevel, checkAuthenticationLevel } from "./route-protection";

type LoadMfaVerificationSessionParams = {
  serviceUrl: string;
  pageName: string;
  missingSessionRedirect: string;
};

type MfaVerificationSession = {
  sessionId?: string;
  loginName?: string;
  organization?: string;
  sessionData: SessionWithAuthData;
};

export async function loadMfaVerificationSession({
  serviceUrl,
  pageName,
  missingSessionRedirect,
}: LoadMfaVerificationSessionParams): Promise<MfaVerificationSession> {
  let sessionId: string | undefined;
  let loginName: string | undefined;
  let organization: string | undefined;

  try {
    ({ sessionId, loginName, organization } = await getSessionCredentials());
  } catch {
    redirect("/password");
  }

  const authCheck = await checkAuthenticationLevel(
    serviceUrl,
    AuthLevel.PASSWORD_REQUIRED,
    loginName,
    organization
  );

  if (!authCheck.satisfied) {
    logMessage.debug({
      message: `${pageName} auth check failed`,
      reason: authCheck.reason,
      redirect: authCheck.redirect,
    });
    redirect(authCheck.redirect || "/password");
  }

  let sessionData: SessionWithAuthData;

  try {
    sessionData = sessionId
      ? await loadSessionById(serviceUrl, sessionId, organization)
      : await loadSessionByLoginname(serviceUrl, loginName, organization);
  } catch {
    logMessage.debug({
      message: `${pageName} missing session factors`,
      hasSessionId: !!sessionId,
      hasLoginName: !!loginName,
      hasOrganization: !!organization,
    });
    redirect(missingSessionRedirect);
  }

  return {
    sessionId,
    loginName,
    organization,
    sessionData,
  };
}
