"use server";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import type { ConnectError } from "@connectrpc/connect";
import { Duration, timestampMs } from "@zitadel/client";
import { CredentialsCheckErrorSchema } from "@zitadel/proto/zitadel/message_pb";
import { RequestChallenges } from "@zitadel/proto/zitadel/session/v2/challenge_pb";
import { Session } from "@zitadel/proto/zitadel/session/v2/session_pb";
import { Checks } from "@zitadel/proto/zitadel/session/v2/session_service_pb";

import { Cookie } from "@lib/cookies";
import { addSessionToCookie, updateSessionCookie } from "@lib/cookies";
import { createSessionFromChecks, getLoginSettings, getSession, setSession } from "@lib/zitadel";

export type CreateSessionFailedError = {
  error: string;
  failedAttempts?: number;
};

const passwordAttemptsHandler = (error: ConnectError) => {
  const details = error.findDetails(CredentialsCheckErrorSchema);

  if (details[0] && "failedAttempts" in details[0]) {
    const failedAttempts = details[0].failedAttempts;
    throw {
      error: `Failed to authenticate: You had ${failedAttempts} password attempts.`,
      failedAttempts: failedAttempts,
    };
  }
  throw error;
};

export async function createSessionAndUpdateCookie(command: {
  checks: Checks;
  requestId: string | undefined;
  retry?: boolean;
}): Promise<Session> {
  const sessionLifetime = await getLoginSettings().then((settings) => {
    if (settings?.passwordCheckLifetime) {
      return settings.passwordCheckLifetime;
    }
    return {
      seconds: BigInt(24 * 60 * 60), // 24 hours
      nanos: 0,
    } as Duration; // for usecases where the lifetime is not specified (user discovery)
  });

  const createdSession = await createSessionFromChecks({
    checks: command.checks,
    lifetime: sessionLifetime,
    retry: command.retry ?? false,
  });

  const { session } = await getSession(createdSession.sessionId, createdSession.sessionToken);

  if (session?.factors?.user?.loginName) {
    const sessionCookie: Cookie = {
      id: createdSession.sessionId,
      token: createdSession.sessionToken,
      creationTs: session.creationDate ? `${timestampMs(session.creationDate)}` : "",
      expirationTs: session.expirationDate ? `${timestampMs(session.expirationDate)}` : "",
      changeTs: session.changeDate ? `${timestampMs(session.changeDate)}` : "",
      loginName: session.factors.user.loginName ?? "",
      displayName: session.factors.user.displayName ?? "",
      userId: session.factors.user.id ?? "",
    };

    if (command.requestId) {
      sessionCookie.requestId = command.requestId;
    }

    if (session.factors.user.organizationId) {
      sessionCookie.organization = session.factors.user.organizationId;
    }

    await addSessionToCookie({ session: sessionCookie });

    return session;
  } else {
    throw "could not get session or session does not have loginName";
  }
}

export async function setSessionAndUpdateCookie(command: {
  activeCookie: Cookie;
  checks?: Checks;
  challenges?: RequestChallenges;
  requestId?: string;
}) {
  const sessionLifetime = await getLoginSettings().then((settings) => {
    if (settings?.passwordCheckLifetime) {
      return settings.passwordCheckLifetime;
    }
    return {
      seconds: BigInt(24 * 60 * 60), // 24 hours
      nanos: 0,
    } as Duration; // for usecases where the lifetime is not specified (user discovery)
  });

  const updatedSession = await setSession({
    sessionId: command.activeCookie.id,
    sessionToken: command.activeCookie.token,
    challenges: command.challenges,
    checks: command.checks,
    lifetime: sessionLifetime,
  }).catch(passwordAttemptsHandler);

  const { session } = await getSession(command.activeCookie.id, updatedSession.sessionToken);

  if (!session?.factors?.user?.loginName) {
    throw "could not get session or session does not have loginName";
  }

  const newCookie: Cookie = {
    id: session.id,
    token: updatedSession.sessionToken,
    creationTs: session.creationDate ? `${timestampMs(session.creationDate)}` : "",
    expirationTs: session.expirationDate ? `${timestampMs(session.expirationDate)}` : "",
    // just overwrite the changeDate with the new one
    changeTs: updatedSession.details?.changeDate
      ? `${timestampMs(updatedSession.details.changeDate)}`
      : "",
    loginName: session.factors?.user?.loginName ?? "",
    displayName: session.factors?.user?.displayName ?? "",
    userId: session.factors?.user?.id ?? "",
    organization: session.factors?.user?.organizationId ?? "",
  };

  if (command.activeCookie.requestId) {
    newCookie.requestId = command.activeCookie.requestId;
  }

  return updateSessionCookie({
    id: session.id,
    session: newCookie,
  }).then(() => {
    return { challenges: updatedSession.challenges, ...session };
  });
}
