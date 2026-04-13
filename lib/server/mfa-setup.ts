import { redirect } from "next/navigation";

import { logMessage } from "@lib/logger";
import { loadSessionById, loadSessionByLoginname, type SessionWithAuthData } from "@lib/session";

import {
  AuthLevel,
  checkAuthenticationLevel,
  requiresStrongMfaSetupVerification,
} from "./route-protection";

type LoadMfaSetupSessionParams = {
  serviceUrl: string;
  sessionId?: string;
  loginName?: string;
  organization?: string;
  pageName: string;
  missingSessionRedirect: string;
};

export async function loadMfaSetupSession({
  serviceUrl,
  sessionId,
  loginName,
  organization,
  pageName,
  missingSessionRedirect,
}: LoadMfaSetupSessionParams): Promise<SessionWithAuthData> {
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

  if (requiresStrongMfaSetupVerification(sessionData)) {
    logMessage.debug({
      message: `${pageName} requires strong MFA re-verification`,
    });
    redirect("/mfa/set/verify");
  }

  return sessionData;
}
