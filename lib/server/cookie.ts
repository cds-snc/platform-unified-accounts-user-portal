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
import { logMessage } from "@lib/logger";
import { createSessionFromChecks, getSession, setSession } from "@lib/zitadel";

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
  lifetime?: Duration;
}): Promise<Session> {
  let sessionLifetime = command.lifetime;

  if (!sessionLifetime || !sessionLifetime.seconds) {
    logMessage.warn("No session lifetime provided, using default of 24 hours.");

    sessionLifetime = {
      seconds: BigInt(24 * 60 * 60), // 24 hours
      nanos: 0,
    } as Duration; // for usecases where the lifetime is not specified (user discovery)
  }

  const createdSession = await createSessionFromChecks({
    checks: command.checks,
    lifetime: sessionLifetime,
    retry: true,
  });

  if (createdSession) {
    return getSession(createdSession.sessionId, createdSession.sessionToken).then(
      async (response) => {
        if (response?.session && response.session?.factors?.user?.loginName) {
          const sessionCookie: Cookie = {
            id: createdSession.sessionId,
            token: createdSession.sessionToken,
            creationTs: response.session.creationDate
              ? `${timestampMs(response.session.creationDate)}`
              : "",
            expirationTs: response.session.expirationDate
              ? `${timestampMs(response.session.expirationDate)}`
              : "",
            changeTs: response.session.changeDate
              ? `${timestampMs(response.session.changeDate)}`
              : "",
            loginName: response.session.factors.user.loginName ?? "",
            userId: response.session.factors.user.id ?? "",
          };

          if (command.requestId) {
            sessionCookie.requestId = command.requestId;
          }

          if (response.session.factors.user.organizationId) {
            sessionCookie.organization = response.session.factors.user.organizationId;
          }

          await addSessionToCookie({ session: sessionCookie });

          return response.session as Session;
        } else {
          throw "could not get session or session does not have loginName";
        }
      }
    );
  } else {
    throw "Could not create session";
  }
}

export async function setSessionAndUpdateCookie(command: {
  activeCookie: Cookie;
  checks?: Checks;
  challenges?: RequestChallenges;
  requestId?: string;
  lifetime: Duration;
}) {
  return setSession({
    sessionId: command.activeCookie.id,
    sessionToken: command.activeCookie.token,
    challenges: command.challenges,
    checks: command.checks,
    lifetime: command.lifetime,
  })
    .then((updatedSession) => {
      if (updatedSession) {
        const sessionCookie: Cookie = {
          id: command.activeCookie.id,
          token: updatedSession.sessionToken,
          creationTs: command.activeCookie.creationTs,
          expirationTs: command.activeCookie.expirationTs,
          // just overwrite the changeDate with the new one
          changeTs: updatedSession.details?.changeDate
            ? `${timestampMs(updatedSession.details.changeDate)}`
            : "",
          loginName: command.activeCookie.loginName,
          userId: command.activeCookie.userId,
          organization: command.activeCookie.organization,
        };

        if (command.requestId) {
          sessionCookie.requestId = command.requestId;
        }

        return getSession(sessionCookie.id, sessionCookie.token).then(async (response) => {
          if (!response?.session || !response.session.factors?.user?.loginName) {
            throw "could not get session or session does not have loginName";
          }

          const { session } = response;
          const newCookie: Cookie = {
            id: sessionCookie.id,
            token: updatedSession.sessionToken,
            creationTs: sessionCookie.creationTs,
            expirationTs: sessionCookie.expirationTs,
            // just overwrite the changeDate with the new one
            changeTs: updatedSession.details?.changeDate
              ? `${timestampMs(updatedSession.details.changeDate)}`
              : "",
            loginName: session.factors?.user?.loginName ?? "",
            userId: session.factors?.user?.id ?? "",
            organization: session.factors?.user?.organizationId ?? "",
          };

          if (sessionCookie.requestId) {
            newCookie.requestId = sessionCookie.requestId;
          }

          return updateSessionCookie({
            id: sessionCookie.id,
            session: newCookie,
          }).then(() => {
            return { challenges: updatedSession.challenges, ...session };
          });
        });
      } else {
        throw "Session not be set";
      }
    })
    .catch(passwordAttemptsHandler);
}
