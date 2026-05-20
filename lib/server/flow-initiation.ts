/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { NextRequest, NextResponse } from "next/server";
import { create } from "@zitadel/client";
import { Prompt } from "@zitadel/proto/zitadel/oidc/v2/authorization_pb";
import {
  CreateCallbackRequestSchema,
  SessionSchema,
} from "@zitadel/proto/zitadel/oidc/v2/oidc_service_pb";
import { Session } from "@zitadel/proto/zitadel/session/v2/session_pb";
import { IdentityProviderType } from "@zitadel/proto/zitadel/settings/v2/login_settings_pb";

import { ZITADEL_ORGANIZATION } from "@root/constants/config";
import { Cookie } from "@lib/cookies";
import { idpTypeToSlug } from "@lib/idp";
import { toAuthRequestId, toOidcRequestId } from "@lib/oidc-request-id";
import { sendLoginname, SendLoginnameCommand } from "@lib/server/loginname";
import { constructUrl } from "@lib/service-url";
import { findValidSession } from "@lib/session";
import { buildUrlWithRequestId } from "@lib/utils";
import {
  createCallback,
  getActiveIdentityProviders,
  getAuthRequest,
  startIdentityProviderFlow,
} from "@lib/zitadel";

import { logMessage } from "../logger";

const IDP_SCOPE_REGEX = /urn:zitadel:iam:org:idp:id:(.+)/;

const gotoLogin = ({
  request,
  requestId,
}: {
  request: NextRequest;
  requestId: string;
}): NextResponse<unknown> => {
  const loginNameUrl = constructUrl(request, buildUrlWithRequestId("/", requestId));

  return NextResponse.redirect(loginNameUrl);
};

export interface FlowInitiationParams {
  requestId: string;
  sessions: Session[];
  sessionCookies: Cookie[];
  request: NextRequest;
}

async function safeFindValidSession({
  sessions,
  authRequest,
}: {
  sessions: Session[];
  authRequest?: Awaited<ReturnType<typeof getAuthRequest>>["authRequest"];
}): Promise<Session | undefined> {
  try {
    return await findValidSession({
      sessions,
      authRequest,
    });
  } catch (error) {
    logMessage.error("Failed to resolve valid session during flow initiation", error);
    return undefined;
  }
}

/**
 * Handle OIDC flow initiation
 */
export async function handleOIDCFlowInitiation(
  params: FlowInitiationParams
): Promise<NextResponse> {
  const { requestId, sessions, sessionCookies, request } = params;

  const authRequestId = toAuthRequestId(requestId);

  const { authRequest } = await getAuthRequest({
    authRequestId,
  });

  const oidcRequestId = authRequest?.id
    ? toOidcRequestId(authRequest.id)
    : toOidcRequestId(requestId);

  const organization = ZITADEL_ORGANIZATION;
  let idpId = "";

  if (authRequest?.scope) {
    const idpScope = authRequest.scope.find((s: string) => IDP_SCOPE_REGEX.test(s));

    if (idpScope) {
      const matched = IDP_SCOPE_REGEX.exec(idpScope);
      idpId = matched?.[1] ?? "";

      const identityProviders = await getActiveIdentityProviders().then((resp) => {
        return resp.identityProviders;
      });

      const idp = identityProviders.find((idp) => idp.id === idpId);

      if (idp) {
        const origin = request.nextUrl.origin;
        const identityProviderType = identityProviders[0].type;

        if (identityProviderType === IdentityProviderType.LDAP) {
          const ldapUrl = constructUrl(request, "/ldap");
          if (authRequest.id) {
            ldapUrl.searchParams.set("requestId", toOidcRequestId(authRequest.id));
          }
          if (organization) {
            ldapUrl.searchParams.set("organization", organization);
          }

          return NextResponse.redirect(ldapUrl);
        }

        const provider = idpTypeToSlug(identityProviderType);

        const params = new URLSearchParams({
          requestId: oidcRequestId,
        });

        if (organization) {
          params.set("organization", organization);
        }

        let url: string | null = await startIdentityProviderFlow({
          idpId,
          urls: {
            successUrl: `${origin}/idp/${provider}/process?` + new URLSearchParams(params),
            failureUrl: `${origin}/idp/${provider}/failure?` + new URLSearchParams(params),
          },
        });

        if (!url) {
          return NextResponse.json({ error: "Could not start IDP flow" }, { status: 500 });
        }

        if (url.startsWith("/")) {
          url = constructUrl(request, url).toString();
        }

        return NextResponse.redirect(url);
      }
    }
  }

  if (authRequest && authRequest.prompt.includes(Prompt.CREATE)) {
    const registerUrl = constructUrl(request, "/register");
    registerUrl.searchParams.set("requestId", oidcRequestId);

    if (organization) {
      registerUrl.searchParams.set("organization", organization);
    }

    return NextResponse.redirect(registerUrl);
  }

  // use existing session and hydrate it for oidc
  if (authRequest && sessions.length) {
    // OIDC prompt=select_account requires explicit user account selection.
    // Only route to account selection if we have at least one valid reusable session.
    // Otherwise, send the user to login to establish a fresh session.
    if (authRequest.prompt.includes(Prompt.SELECT_ACCOUNT)) {
      return gotoLogin({
        request,
        requestId: oidcRequestId,
      });

      // OIDC prompt=login requires active re-authentication.
      // Prefer known login hint flow when available, otherwise show login page.
    } else if (authRequest.prompt.includes(Prompt.LOGIN)) {
      if (authRequest.loginHint) {
        try {
          const command: SendLoginnameCommand = {
            loginName: authRequest.loginHint,
            requestId: authRequest.id,
          };

          const res = await sendLoginname(command);

          if (res && "redirect" in res && res?.redirect) {
            const absoluteUrl = constructUrl(request, res.redirect);
            return NextResponse.redirect(absoluteUrl.toString());
          }
        } catch (error) {
          logMessage.error("sendLoginname failed during OIDC login hint flow", error);
        }
      }

      return gotoLogin({
        request,
        requestId: oidcRequestId,
      });
      // OIDC prompt=none must not require user interaction.
      // If no valid reusable session is found, return an interaction-required style error response.
    } else if (authRequest.prompt.includes(Prompt.NONE)) {
      const selectedSession = await safeFindValidSession({
        sessions,
        authRequest,
      });

      const noSessionResponse = NextResponse.json(
        { error: "No active session found" },
        { status: 400 }
      );

      if (!selectedSession || !selectedSession.id) {
        return noSessionResponse;
      }

      const cookie = sessionCookies.find((cookie) => cookie.id === selectedSession.id);

      if (!cookie || !cookie.id || !cookie.token) {
        return noSessionResponse;
      }

      const session = {
        sessionId: cookie.id,
        sessionToken: cookie.token,
      };

      const { callbackUrl } = await createCallback({
        req: create(CreateCallbackRequestSchema, {
          authRequestId,
          callbackKind: {
            case: "session",
            value: create(SessionSchema, session),
          },
        }),
      });

      const callbackResponse = NextResponse.redirect(callbackUrl);

      return callbackResponse;
      // Default OIDC behavior: silently continue with a valid session when possible.
      // If continuation cannot be completed (no valid session/cookie/callback failure),
      // fall back to interactive login with requestId context.
    } else {
      const selectedSession = await safeFindValidSession({
        sessions,
        authRequest,
      });

      if (!selectedSession || !selectedSession.id) {
        return gotoLogin({
          request,
          requestId: oidcRequestId,
        });
      }

      const cookie = sessionCookies.find((cookie) => cookie.id === selectedSession.id);

      if (!cookie || !cookie.id || !cookie.token) {
        return gotoLogin({
          request,
          requestId: oidcRequestId,
        });
      }

      const session = {
        sessionId: cookie.id,
        sessionToken: cookie.token,
      };

      try {
        const { callbackUrl } = await createCallback({
          req: create(CreateCallbackRequestSchema, {
            authRequestId,
            callbackKind: {
              case: "session",
              value: create(SessionSchema, session),
            },
          }),
        });
        if (callbackUrl) {
          return NextResponse.redirect(callbackUrl);
        } else {
          logMessage.warn(
            `Could not create OIDC callback, redirecting to login for requestId: ${oidcRequestId}`
          );
          return gotoLogin({
            request,
            requestId: oidcRequestId,
          });
        }
      } catch (error) {
        logMessage.error("Flow initiation failed, redirecting to login", error);
        return gotoLogin({
          request,
          requestId: oidcRequestId,
        });
      }
    }
  } else {
    // No local sessions available - start an interactive login with request context.
    return gotoLogin({
      request,
      requestId: oidcRequestId,
    });
  }
}
