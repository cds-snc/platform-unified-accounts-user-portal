/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { Client, create, Duration } from "@zitadel/client";
import { createServerTransport as libCreateServerTransport } from "@zitadel/client/node";
import { makeReqCtx } from "@zitadel/client/v2";
import { IdentityProviderService } from "@zitadel/proto/zitadel/idp/v2/idp_service_pb";
import {
  OrganizationSchema,
  RequestContext,
  TextQueryMethod,
} from "@zitadel/proto/zitadel/object/v2/object_pb";
import { CreateCallbackRequest, OIDCService } from "@zitadel/proto/zitadel/oidc/v2/oidc_service_pb";
import { Organization } from "@zitadel/proto/zitadel/org/v2/org_pb";
import { OrganizationService } from "@zitadel/proto/zitadel/org/v2/org_service_pb";
import { RequestChallenges } from "@zitadel/proto/zitadel/session/v2/challenge_pb";
import { Checks, SessionService } from "@zitadel/proto/zitadel/session/v2/session_service_pb";
import { LoginSettings } from "@zitadel/proto/zitadel/settings/v2/login_settings_pb";
import { SettingsService } from "@zitadel/proto/zitadel/settings/v2/settings_service_pb";
import {
  ReturnEmailVerificationCodeSchema,
  SendEmailVerificationCodeSchema,
} from "@zitadel/proto/zitadel/user/v2/email_pb";
import type { RedirectURLsJson } from "@zitadel/proto/zitadel/user/v2/idp_pb";
import {
  NotificationType,
  ReturnPasswordResetCodeSchema,
  SendPasswordResetLinkSchema,
} from "@zitadel/proto/zitadel/user/v2/password_pb";
import { SearchQuery, SearchQuerySchema } from "@zitadel/proto/zitadel/user/v2/query_pb";
import { SendInviteCodeSchema } from "@zitadel/proto/zitadel/user/v2/user_pb";
import {
  AddHumanUserRequest,
  AddHumanUserRequestSchema,
  ResendEmailCodeRequest,
  ResendEmailCodeRequestSchema,
  SendEmailCodeRequestSchema,
  SetPasswordRequest,
  SetPasswordRequestSchema,
  UpdateHumanUserRequest,
  UserService,
  VerifyU2FRegistrationRequest,
} from "@zitadel/proto/zitadel/user/v2/user_service_pb";

// import { unstable_cacheLife as cacheLife } from "next/cache";
import { serverTranslation } from "@i18n/server";

import { getUserAgent } from "./fingerprint";
import { createServiceForHost } from "./service";
import { getSerializableObject } from "./utils";

const useCache = process.env.DEBUG !== "true";

async function cacheWrapper<T>(callback: Promise<T>) {
  // "use cache";
  // cacheLife("hours");

  return callback;
}

export async function getHostedLoginTranslation({
  serviceUrl,
  organization,
  locale,
}: {
  serviceUrl: string;
  organization?: string;
  locale?: string;
}) {
  const settingsService: Client<typeof SettingsService> = await createServiceForHost(
    SettingsService,
    serviceUrl
  );

  const callback = settingsService
    .getHostedLoginTranslation(
      {
        level: organization
          ? {
              case: "organizationId",
              value: organization,
            }
          : {
              case: "instance",
              value: true,
            },
        locale: locale,
      },
      {}
    )
    .then((resp) => {
      return resp.translations ? resp.translations : undefined;
    });

  return useCache ? cacheWrapper(callback) : callback;
}

export async function getBrandingSettings({
  serviceUrl,
  organization,
}: {
  serviceUrl: string;
  organization?: string;
}) {
  const settingsService: Client<typeof SettingsService> = await createServiceForHost(
    SettingsService,
    serviceUrl
  );

  const callback = settingsService
    .getBrandingSettings({ ctx: makeReqCtx(organization) }, {})
    .then((resp) => (resp.settings ? resp.settings : undefined));

  return useCache ? cacheWrapper(callback) : callback;
}

export async function getLoginSettings({
  serviceUrl,
  organization,
}: {
  serviceUrl: string;
  organization?: string;
}) {
  const settingsService: Client<typeof SettingsService> = await createServiceForHost(
    SettingsService,
    serviceUrl
  );

  const callback = settingsService
    .getLoginSettings({ ctx: makeReqCtx(organization) }, {})
    .then((resp) => (resp.settings ? resp.settings : undefined));

  return useCache ? cacheWrapper(callback) : callback;
}

export async function getSerializableLoginSettings({
  serviceUrl,
  organizationId,
}: {
  serviceUrl: string;
  organizationId?: string;
}) {
  const loginSettings = await getLoginSettings({
    serviceUrl,
    organization: organizationId,
  }).then((obj) => getSerializableObject(obj));

  if (!loginSettings) {
    throw new Error("No login settings found");
  }

  return loginSettings;
}

export async function getSecuritySettings({ serviceUrl }: { serviceUrl: string }) {
  const settingsService: Client<typeof SettingsService> = await createServiceForHost(
    SettingsService,
    serviceUrl
  );

  const callback = settingsService
    .getSecuritySettings({})
    .then((resp) => (resp.settings ? resp.settings : undefined));

  return useCache ? cacheWrapper(callback) : callback;
}

export async function getLockoutSettings({
  serviceUrl,
  orgId,
}: {
  serviceUrl: string;
  orgId?: string;
}) {
  const settingsService: Client<typeof SettingsService> = await createServiceForHost(
    SettingsService,
    serviceUrl
  );

  const callback = settingsService
    .getLockoutSettings({ ctx: makeReqCtx(orgId) }, {})
    .then((resp) => (resp.settings ? resp.settings : undefined));

  return useCache ? cacheWrapper(callback) : callback;
}

/**
 * @security Requires authenticated session. Use protectedGetPasswordExpirySettings from lib/server/zitadel-protected.ts
 */
export async function getPasswordExpirySettings({
  serviceUrl,
  orgId,
}: {
  serviceUrl: string;
  orgId?: string;
}) {
  const settingsService: Client<typeof SettingsService> = await createServiceForHost(
    SettingsService,
    serviceUrl
  );

  const callback = settingsService
    .getPasswordExpirySettings({ ctx: makeReqCtx(orgId) }, {})
    .then((resp) => (resp.settings ? resp.settings : undefined));

  return useCache ? cacheWrapper(callback) : callback;
}

/**
 * @security Requires authenticated session. Use protectedListIDPLinks from lib/server/zitadel-protected.ts
 */
export async function listIDPLinks({ serviceUrl, userId }: { serviceUrl: string; userId: string }) {
  const userService: Client<typeof UserService> = await createServiceForHost(
    UserService,
    serviceUrl
  );

  return userService.listIDPLinks({ userId }, {});
}

/**
 * @security Requires authenticated session. Use protectedAddOTPEmail from lib/server/zitadel-protected.ts
 */
export async function addOTPEmail({ serviceUrl, userId }: { serviceUrl: string; userId: string }) {
  const userService: Client<typeof UserService> = await createServiceForHost(
    UserService,
    serviceUrl
  );

  return userService.addOTPEmail({ userId }, {});
}

/**
 * @security Requires authenticated session. Use protectedAddOTPSMS from lib/server/zitadel-protected.ts
 */
export async function addOTPSMS({ serviceUrl, userId }: { serviceUrl: string; userId: string }) {
  const userService: Client<typeof UserService> = await createServiceForHost(
    UserService,
    serviceUrl
  );

  return userService.addOTPSMS({ userId }, {});
}

/**
 * @security Requires authenticated session. Returns cryptographic secret material. Use protectedRegisterTOTP from lib/server/zitadel-protected.ts
 */
export async function registerTOTP({ serviceUrl, userId }: { serviceUrl: string; userId: string }) {
  const userService: Client<typeof UserService> = await createServiceForHost(
    UserService,
    serviceUrl
  );

  return userService.registerTOTP({ userId }, {});
}

export async function getGeneralSettings({ serviceUrl }: { serviceUrl: string }) {
  const settingsService: Client<typeof SettingsService> = await createServiceForHost(
    SettingsService,
    serviceUrl
  );

  const callback = settingsService
    .getGeneralSettings({}, {})
    .then((resp) => resp.supportedLanguages);

  return useCache ? cacheWrapper(callback) : callback;
}

export async function getLegalAndSupportSettings({
  serviceUrl,
  organization,
}: {
  serviceUrl: string;
  organization?: string;
}) {
  const settingsService: Client<typeof SettingsService> = await createServiceForHost(
    SettingsService,
    serviceUrl
  );

  const callback = settingsService
    .getLegalAndSupportSettings({ ctx: makeReqCtx(organization) }, {})
    .then((resp) => (resp.settings ? resp.settings : undefined));

  return useCache ? cacheWrapper(callback) : callback;
}

export async function getPasswordComplexitySettings({
  serviceUrl,
  organization,
}: {
  serviceUrl: string;
  organization?: string;
}) {
  const settingsService: Client<typeof SettingsService> = await createServiceForHost(
    SettingsService,
    serviceUrl
  );

  const callback = settingsService
    .getPasswordComplexitySettings({ ctx: makeReqCtx(organization) })
    .then((resp) => (resp.settings ? resp.settings : undefined));

  return useCache ? cacheWrapper(callback) : callback;
}

/**
 * @security Creates authenticated session after auth checks pass. Internal use in auth flow.
 */
export async function createSessionFromChecks({
  serviceUrl,
  checks,
  lifetime,
}: {
  serviceUrl: string;
  checks: Checks;
  lifetime: Duration;
}) {
  const sessionService: Client<typeof SessionService> = await createServiceForHost(
    SessionService,
    serviceUrl
  );

  const userAgent = await getUserAgent();

  return sessionService.createSession({ checks, lifetime, userAgent }, {});
}

/**
 * @security Creates session after IDP login. Internal use in auth flow.
 */
export async function createSessionForUserIdAndIdpIntent({
  serviceUrl,
  userId,
  idpIntent,
  lifetime,
}: {
  serviceUrl: string;
  userId: string;
  idpIntent: {
    idpIntentId?: string | undefined;
    idpIntentToken?: string | undefined;
  };
  lifetime: Duration;
}) {
  console.log("Creating session for userId and IDP intent", { userId, idpIntent, lifetime });
  const sessionService: Client<typeof SessionService> = await createServiceForHost(
    SessionService,
    serviceUrl
  );

  const userAgent = await getUserAgent();

  return sessionService.createSession({
    checks: {
      user: {
        search: {
          case: "userId",
          value: userId,
        },
      },
      idpIntent,
    },
    lifetime,
    userAgent,
  });
}

/**
 * @security Updates session state during auth flow. Internal use only.
 */
export async function setSession({
  serviceUrl,
  sessionId,
  sessionToken,
  challenges,
  checks,
  lifetime,
}: {
  serviceUrl: string;
  sessionId: string;
  sessionToken: string;
  challenges: RequestChallenges | undefined;
  checks?: Checks;
  lifetime: Duration;
}) {
  const sessionService: Client<typeof SessionService> = await createServiceForHost(
    SessionService,
    serviceUrl
  );

  return sessionService.setSession(
    {
      sessionId,
      sessionToken,
      challenges,
      checks: checks ? checks : {},
      metadata: {},
      lifetime,
    },
    {}
  );
}

/**
 * @security Requires authenticated session tokens. Internal use only.
 */
export async function getSession({
  serviceUrl,
  sessionId,
  sessionToken,
}: {
  serviceUrl: string;
  sessionId: string;
  sessionToken: string;
}) {
  const sessionService: Client<typeof SessionService> = await createServiceForHost(
    SessionService,
    serviceUrl
  );

  return sessionService.getSession({ sessionId, sessionToken }, {});
}

/**
 * @security Requires authenticated session tokens. Logout operation.
 */
export async function deleteSession({
  serviceUrl,
  sessionId,
  sessionToken,
}: {
  serviceUrl: string;
  sessionId: string;
  sessionToken: string;
}) {
  const sessionService: Client<typeof SessionService> = await createServiceForHost(
    SessionService,
    serviceUrl
  );

  return sessionService.deleteSession({ sessionId, sessionToken }, {});
}

type ListSessionsCommand = {
  serviceUrl: string;
  ids: string[];
};

/**
 * @security Internal use only. Lists sessions by their IDs.
 */
export async function listSessions({ serviceUrl, ids }: ListSessionsCommand) {
  const sessionService: Client<typeof SessionService> = await createServiceForHost(
    SessionService,
    serviceUrl
  );

  return sessionService.listSessions(
    {
      queries: [
        {
          query: {
            case: "idsQuery",
            value: { ids },
          },
        },
      ],
    },
    {}
  );
}

type AddHumanUserData = {
  serviceUrl: string;
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  organization: string;
};

export async function addHumanUser({
  serviceUrl,
  email,
  firstName,
  lastName,
  password,
  organization,
}: AddHumanUserData) {
  const userService: Client<typeof UserService> = await createServiceForHost(
    UserService,
    serviceUrl
  );

  let addHumanUserRequest: AddHumanUserRequest = create(AddHumanUserRequestSchema, {
    email: {
      email,
      verification: {
        case: "isVerified",
        value: false,
      },
    },
    username: email,
    profile: { givenName: firstName, familyName: lastName },
    passwordType: password ? { case: "password", value: { password } } : undefined,
  });

  if (organization) {
    const organizationSchema = create(OrganizationSchema, {
      org: { case: "orgId", value: organization },
    });

    addHumanUserRequest = {
      ...addHumanUserRequest,
      organization: organizationSchema,
    };
  }

  return userService.addHumanUser(addHumanUserRequest);
}

export async function addHuman({
  serviceUrl,
  request,
}: {
  serviceUrl: string;
  request: AddHumanUserRequest;
}) {
  const userService: Client<typeof UserService> = await createServiceForHost(
    UserService,
    serviceUrl
  );

  return userService.addHumanUser(request);
}

/**
 * @security Requires authenticated session. Use protected wrapper from lib/server/zitadel-protected.ts
 */
export async function updateHuman({
  serviceUrl,
  request,
}: {
  serviceUrl: string;
  request: UpdateHumanUserRequest;
}) {
  const userService: Client<typeof UserService> = await createServiceForHost(
    UserService,
    serviceUrl
  );

  return userService.updateHumanUser(request);
}

/**
 * @security Requires authenticated session. Use protectedVerifyTOTPRegistration from lib/server/zitadel-protected.ts
 */
export async function verifyTOTPRegistration({
  serviceUrl,
  code,
  userId,
}: {
  serviceUrl: string;
  code: string;
  userId: string;
}) {
  const userService: Client<typeof UserService> = await createServiceForHost(
    UserService,
    serviceUrl
  );

  return userService.verifyTOTPRegistration({ code, userId }, {});
}

/**
 * @security Requires authenticated session. Use protectedGetUserByID from lib/server/zitadel-protected.ts
 */
export async function getUserByID({ serviceUrl, userId }: { serviceUrl: string; userId: string }) {
  const userService: Client<typeof UserService> = await createServiceForHost(
    UserService,
    serviceUrl
  );

  return userService.getUserByID({ userId }, {});
}

/**
 * @security Requires authenticated session. Use protectedHumanMFAInitSkipped from lib/server/zitadel-protected.ts
 */
export async function humanMFAInitSkipped({
  serviceUrl,
  userId,
}: {
  serviceUrl: string;
  userId: string;
}) {
  const userService: Client<typeof UserService> = await createServiceForHost(
    UserService,
    serviceUrl
  );

  return userService.humanMFAInitSkipped({ userId }, {});
}

export async function verifyInviteCode({
  serviceUrl,
  userId,
  verificationCode,
}: {
  serviceUrl: string;
  userId: string;
  verificationCode: string;
}) {
  const userService: Client<typeof UserService> = await createServiceForHost(
    UserService,
    serviceUrl
  );

  return userService.verifyInviteCode({ userId, verificationCode }, {});
}

export async function sendEmailCode({
  serviceUrl,
  userId,
  urlTemplate,
}: {
  serviceUrl: string;
  userId: string;
  urlTemplate: string;
}) {
  let medium = create(SendEmailCodeRequestSchema, { userId });

  medium = create(SendEmailCodeRequestSchema, {
    ...medium,
    verification: {
      case: "sendCode",
      value: create(SendEmailVerificationCodeSchema, {
        urlTemplate,
      }),
    },
  });

  const userService: Client<typeof UserService> = await createServiceForHost(
    UserService,
    serviceUrl
  );

  return userService.sendEmailCode(medium, {});
}

export async function sendEmailCodeWithReturn({
  serviceUrl,
  userId,
}: {
  serviceUrl: string;
  userId: string;
}): Promise<{ verificationCode?: string }> {
  const medium = create(SendEmailCodeRequestSchema, {
    userId,
    verification: {
      case: "returnCode",
      value: create(ReturnEmailVerificationCodeSchema, {}),
    },
  });

  const userService: Client<typeof UserService> = await createServiceForHost(
    UserService,
    serviceUrl
  );

  return userService.sendEmailCode(medium, {});
}

export async function createInviteCode({
  serviceUrl,
  urlTemplate,
  userId,
}: {
  serviceUrl: string;
  urlTemplate: string;
  userId: string;
}) {
  let medium = create(SendInviteCodeSchema, {
    applicationName: process.env.NEXT_PUBLIC_APPLICATION_NAME || "Zitadel Login",
  });

  medium = {
    ...medium,
    urlTemplate,
  };

  const userService: Client<typeof UserService> = await createServiceForHost(
    UserService,
    serviceUrl
  );

  return userService.createInviteCode(
    {
      userId,
      verification: {
        case: "sendCode",
        value: medium,
      },
    },
    {}
  );
}

type ListUsersCommand = {
  serviceUrl: string;
  loginName?: string;
  userName?: string;
  email?: string;
  phone?: string;
  organizationId?: string;
};

export async function listUsers({
  serviceUrl,
  loginName,
  userName,
  phone,
  email,
  organizationId,
}: ListUsersCommand) {
  const queries: SearchQuery[] = [];

  // either use loginName or userName, email, phone
  if (loginName) {
    queries.push(
      create(SearchQuerySchema, {
        query: {
          case: "loginNameQuery",
          value: {
            loginName,
            method: TextQueryMethod.EQUALS,
          },
        },
      })
    );
  } else if (userName || email || phone) {
    const orQueries: SearchQuery[] = [];

    if (userName) {
      const userNameQuery = create(SearchQuerySchema, {
        query: {
          case: "userNameQuery",
          value: {
            userName,
            method: TextQueryMethod.EQUALS,
          },
        },
      });
      orQueries.push(userNameQuery);
    }

    if (email) {
      const emailQuery = create(SearchQuerySchema, {
        query: {
          case: "emailQuery",
          value: {
            emailAddress: email,
            method: TextQueryMethod.EQUALS,
          },
        },
      });
      orQueries.push(emailQuery);
    }

    if (phone) {
      const phoneQuery = create(SearchQuerySchema, {
        query: {
          case: "phoneQuery",
          value: {
            number: phone,
            method: TextQueryMethod.EQUALS,
          },
        },
      });
      orQueries.push(phoneQuery);
    }

    queries.push(
      create(SearchQuerySchema, {
        query: {
          case: "orQuery",
          value: {
            queries: orQueries,
          },
        },
      })
    );
  }

  if (organizationId) {
    queries.push(
      create(SearchQuerySchema, {
        query: {
          case: "organizationIdQuery",
          value: {
            organizationId,
          },
        },
      })
    );
  }

  const userService: Client<typeof UserService> = await createServiceForHost(
    UserService,
    serviceUrl
  );

  return userService.listUsers({ queries });
}

export type SearchUsersCommand = {
  serviceUrl: string;
  searchValue: string;
  loginSettings: LoginSettings;
  organizationId?: string;
  suffix?: string;
};

// Re-export types used by protected server actions
export type { VerifyU2FRegistrationRequest };

const PhoneQuery = (searchValue: string) =>
  create(SearchQuerySchema, {
    query: {
      case: "phoneQuery",
      value: {
        number: searchValue,
        method: TextQueryMethod.EQUALS,
      },
    },
  });

const LoginNameQuery = (searchValue: string) =>
  create(SearchQuerySchema, {
    query: {
      case: "loginNameQuery",
      value: {
        loginName: searchValue,
        method: TextQueryMethod.EQUALS_IGNORE_CASE,
      },
    },
  });

const EmailQuery = (searchValue: string) =>
  create(SearchQuerySchema, {
    query: {
      case: "emailQuery",
      value: {
        emailAddress: searchValue,
        method: TextQueryMethod.EQUALS_IGNORE_CASE,
      },
    },
  });

/**
 * this is a dedicated search function to search for users from the loginname page
 * it searches users based on the loginName or userName and org suffix combination, and falls back to email and phone if no users are found
 *  */
export async function searchUsers({
  serviceUrl,
  searchValue,
  loginSettings,
  organizationId,
  suffix,
}: SearchUsersCommand) {
  const queries: SearchQuery[] = [];

  const { t } = await serverTranslation("zitadel");

  // if a suffix is provided, we search for the userName concatenated with the suffix
  if (suffix) {
    const searchValueWithSuffix = `${searchValue}@${suffix}`;
    const loginNameQuery = LoginNameQuery(searchValueWithSuffix);
    queries.push(loginNameQuery);
  } else {
    const loginNameQuery = LoginNameQuery(searchValue);
    queries.push(loginNameQuery);
  }

  if (organizationId) {
    queries.push(
      create(SearchQuerySchema, {
        query: {
          case: "organizationIdQuery",
          value: {
            organizationId,
          },
        },
      })
    );
  }

  const userService: Client<typeof UserService> = await createServiceForHost(
    UserService,
    serviceUrl
  );

  const loginNameResult = await userService.listUsers({ queries });

  if (!loginNameResult || !loginNameResult.details) {
    return { error: t("errors.errorOccured") };
  }

  if (loginNameResult.result.length > 1) {
    return { error: t("errors.multipleUsersFound") };
  }

  if (loginNameResult.result.length == 1) {
    return loginNameResult;
  }

  const emailAndPhoneQueries: SearchQuery[] = [];
  if (loginSettings.disableLoginWithEmail && loginSettings.disableLoginWithPhone) {
    // Both email and phone login are disabled, return empty result
    return { result: [] };
  } else if (loginSettings.disableLoginWithEmail && searchValue.length <= 20) {
    const phoneQuery = PhoneQuery(searchValue);
    emailAndPhoneQueries.push(phoneQuery);
  } else if (loginSettings.disableLoginWithPhone) {
    const emailQuery = EmailQuery(searchValue);
    emailAndPhoneQueries.push(emailQuery);
  } else {
    const orQuery: SearchQuery[] = [];

    const emailQuery = EmailQuery(searchValue);
    orQuery.push(emailQuery);

    let phoneQuery;
    if (searchValue.length <= 20) {
      phoneQuery = PhoneQuery(searchValue);
      orQuery.push(phoneQuery);
    }

    emailAndPhoneQueries.push(
      create(SearchQuerySchema, {
        query: {
          case: "orQuery",
          value: {
            queries: orQuery,
          },
        },
      })
    );
  }

  if (organizationId) {
    emailAndPhoneQueries.push(
      create(SearchQuerySchema, {
        query: {
          case: "organizationIdQuery",
          value: {
            organizationId,
          },
        },
      })
    );
  }

  const emailOrPhoneResult = await userService.listUsers({
    queries: emailAndPhoneQueries,
  });

  if (!emailOrPhoneResult || !emailOrPhoneResult.details) {
    return { error: t("errors.errorOccured") };
  }

  if (emailOrPhoneResult.result.length > 1) {
    return { error: t("errors.multipleUsersFound") };
  }

  if (emailOrPhoneResult.result.length == 1) {
    return emailOrPhoneResult;
  }

  // No users found - return empty result, not an error
  return { result: [] };
}

export async function getDefaultOrg({
  serviceUrl,
}: {
  serviceUrl: string;
}): Promise<Organization | null> {
  const orgService: Client<typeof OrganizationService> = await createServiceForHost(
    OrganizationService,
    serviceUrl
  );

  return orgService
    .listOrganizations(
      {
        queries: [
          {
            query: {
              case: "defaultQuery",
              value: {},
            },
          },
        ],
      },
      {}
    )
    .then((resp) => (resp?.result && resp.result[0] ? resp.result[0] : null));
}

export async function getOrgsByDomain({
  serviceUrl,
  domain,
}: {
  serviceUrl: string;
  domain: string;
}) {
  const orgService: Client<typeof OrganizationService> = await createServiceForHost(
    OrganizationService,
    serviceUrl
  );

  return orgService.listOrganizations(
    {
      queries: [
        {
          query: {
            case: "domainQuery",
            value: { domain, method: TextQueryMethod.EQUALS },
          },
        },
      ],
    },
    {}
  );
}

export async function startIdentityProviderFlow({
  serviceUrl,
  idpId,
  urls,
}: {
  serviceUrl: string;
  idpId: string;
  urls: RedirectURLsJson;
}): Promise<string | null> {
  const userService: Client<typeof UserService> = await createServiceForHost(
    UserService,
    serviceUrl
  );

  return userService
    .startIdentityProviderIntent({
      idpId,
      content: {
        case: "urls",
        value: urls,
      },
    })
    .then(async (resp) => {
      if (resp.nextStep.case === "authUrl" && resp.nextStep.value) {
        return resp.nextStep.value;
      } else {
        return null;
      }
    });
}

export async function startLDAPIdentityProviderFlow({
  serviceUrl,
  idpId,
  username,
  password,
}: {
  serviceUrl: string;
  idpId: string;
  username: string;
  password: string;
}) {
  const userService: Client<typeof UserService> = await createServiceForHost(
    UserService,
    serviceUrl
  );

  return userService.startIdentityProviderIntent({
    idpId,
    content: {
      case: "ldap",
      value: {
        username,
        password,
      },
    },
  });
}

export async function getAuthRequest({
  serviceUrl,
  authRequestId,
}: {
  serviceUrl: string;
  authRequestId: string;
}) {
  const oidcService = await createServiceForHost(OIDCService, serviceUrl);

  return oidcService.getAuthRequest({
    authRequestId,
  });
}

export async function getDeviceAuthorizationRequest({
  serviceUrl,
  userCode,
}: {
  serviceUrl: string;
  userCode: string;
}) {
  const oidcService = await createServiceForHost(OIDCService, serviceUrl);

  return oidcService.getDeviceAuthorizationRequest({
    userCode,
  });
}

export async function authorizeOrDenyDeviceAuthorization({
  serviceUrl,
  deviceAuthorizationId,
  session,
}: {
  serviceUrl: string;
  deviceAuthorizationId: string;
  session?: { sessionId: string; sessionToken: string };
}) {
  const oidcService = await createServiceForHost(OIDCService, serviceUrl);

  return oidcService.authorizeOrDenyDeviceAuthorization({
    deviceAuthorizationId,
    decision: session
      ? {
          case: "session",
          value: session,
        }
      : {
          case: "deny",
          value: {},
        },
  });
}

export async function createCallback({
  serviceUrl,
  req,
}: {
  serviceUrl: string;
  req: CreateCallbackRequest;
}) {
  const oidcService = await createServiceForHost(OIDCService, serviceUrl);

  return oidcService.createCallback(req);
}

export async function verifyEmail({
  serviceUrl,
  userId,
  verificationCode,
}: {
  serviceUrl: string;
  userId: string;
  verificationCode: string;
}) {
  const userService: Client<typeof UserService> = await createServiceForHost(
    UserService,
    serviceUrl
  );

  return userService.verifyEmail(
    {
      userId,
      verificationCode,
    },
    {}
  );
}

export async function resendEmailCode({
  serviceUrl,
  userId,
  urlTemplate,
}: {
  serviceUrl: string;
  userId: string;
  urlTemplate: string;
}) {
  let request: ResendEmailCodeRequest = create(ResendEmailCodeRequestSchema, {
    userId,
  });

  const medium = create(SendEmailVerificationCodeSchema, {
    urlTemplate,
  });

  request = { ...request, verification: { case: "sendCode", value: medium } };

  const userService: Client<typeof UserService> = await createServiceForHost(
    UserService,
    serviceUrl
  );

  return userService.resendEmailCode(request, {});
}

export async function retrieveIDPIntent({
  serviceUrl,
  id,
  token,
}: {
  serviceUrl: string;
  id: string;
  token: string;
}) {
  const userService: Client<typeof UserService> = await createServiceForHost(
    UserService,
    serviceUrl
  );

  return userService.retrieveIdentityProviderIntent({ idpIntentId: id, idpIntentToken: token }, {});
}

export async function getIDPByID({ serviceUrl, id }: { serviceUrl: string; id: string }) {
  const idpService: Client<typeof IdentityProviderService> = await createServiceForHost(
    IdentityProviderService,
    serviceUrl
  );

  return idpService.getIDPByID({ id }, {}).then((resp) => resp.idp);
}

/**
 * @security Requires authenticated session. Use protectedAddIDPLink from lib/server/zitadel-protected.ts
 */
export async function addIDPLink({
  serviceUrl,
  idp,
  userId,
}: {
  serviceUrl: string;
  idp: { id: string; userId: string; userName: string };
  userId: string;
}) {
  const userService: Client<typeof UserService> = await createServiceForHost(
    UserService,
    serviceUrl
  );

  return userService.addIDPLink(
    {
      idpLink: {
        userId: idp.userId,
        idpId: idp.id,
        userName: idp.userName,
      },
      userId,
    },
    {}
  );
}

export async function passwordReset({
  serviceUrl,
  userId,
  urlTemplate,
}: {
  serviceUrl: string;
  userId: string;
  urlTemplate?: string;
}) {
  let medium = create(SendPasswordResetLinkSchema, {
    notificationType: NotificationType.Email,
  });

  medium = {
    ...medium,
    urlTemplate,
  };

  const userService: Client<typeof UserService> = await createServiceForHost(
    UserService,
    serviceUrl
  );

  return userService.passwordReset(
    {
      userId,
      medium: {
        case: "sendLink",
        value: medium,
      },
    },
    {}
  );
}

/**
 * Request a password reset code that is returned instead of sent via email.
 * This allows sending the code via GC Notify instead of Zitadel's built-in email.
 */
export async function passwordResetWithReturn({
  serviceUrl,
  userId,
}: {
  serviceUrl: string;
  userId: string;
}): Promise<{ verificationCode?: string }> {
  const medium = create(ReturnPasswordResetCodeSchema, {});

  const userService: Client<typeof UserService> = await createServiceForHost(
    UserService,
    serviceUrl
  );

  return userService.passwordReset(
    {
      userId,
      medium: {
        case: "returnCode",
        value: medium,
      },
    },
    {}
  );
}

export async function setUserPassword({
  serviceUrl,
  userId,
  password,
  code,
}: {
  serviceUrl: string;
  userId: string;
  password: string;
  code?: string;
}) {
  let payload = create(SetPasswordRequestSchema, {
    userId,
    newPassword: {
      password,
    },
  });

  if (code) {
    payload = {
      ...payload,
      verification: {
        case: "verificationCode",
        value: code,
      },
    };
  }

  const userService: Client<typeof UserService> = await createServiceForHost(
    UserService,
    serviceUrl
  );

  return userService.setPassword(payload, {}).catch((error) => {
    // throw error if failed precondition (ex. User is not yet initialized)
    if (error.code === 9 && error.message) {
      return { error: error.message };
    } else {
      throw error;
    }
  });
}

export async function setPassword({
  serviceUrl,
  payload,
}: {
  serviceUrl: string;
  payload: SetPasswordRequest;
}) {
  const userService: Client<typeof UserService> = await createServiceForHost(
    UserService,
    serviceUrl
  );

  return userService.setPassword(payload, {});
}

/**
 * @security Requires authenticated session. Returns cryptographic challenge data. Use protectedRegisterU2F from lib/server/zitadel-protected.ts
 */
export async function registerU2F({
  serviceUrl,
  userId,
  domain,
}: {
  serviceUrl: string;
  userId: string;
  domain: string;
}) {
  const userService: Client<typeof UserService> = await createServiceForHost(
    UserService,
    serviceUrl
  );

  return userService.registerU2F({
    userId,
    domain,
  });
}

/**
 * @security Requires authenticated session. Use protectedVerifyU2FRegistration from lib/server/zitadel-protected.ts
 */
export async function verifyU2FRegistration({
  serviceUrl,
  request,
}: {
  serviceUrl: string;
  request: VerifyU2FRegistrationRequest;
}) {
  const userService: Client<typeof UserService> = await createServiceForHost(
    UserService,
    serviceUrl
  );

  return userService.verifyU2FRegistration(request, {});
}

/**
 *
 * @param host
 * @param orgId the organization ID
 * @param linking_allowed whether linking is allowed
 * @returns the active identity providers
 */
export async function getActiveIdentityProviders({
  serviceUrl,
  orgId,
  linking_allowed,
}: {
  serviceUrl: string;
  orgId?: string;
  linking_allowed?: boolean;
}) {
  const props: { ctx: RequestContext; linkingAllowed?: boolean } = { ctx: makeReqCtx(orgId) };
  if (linking_allowed) {
    props.linkingAllowed = linking_allowed;
  }
  const settingsService: Client<typeof SettingsService> = await createServiceForHost(
    SettingsService,
    serviceUrl
  );

  return settingsService.getActiveIdentityProviders(props, {});
}

/**
 * @security Requires authenticated session. Use protectedListAuthenticationMethodTypes from lib/server/zitadel-protected.ts
 */
export async function listAuthenticationMethodTypes({
  serviceUrl,
  userId,
}: {
  serviceUrl: string;
  userId: string;
}) {
  const userService: Client<typeof UserService> = await createServiceForHost(
    UserService,
    serviceUrl
  );

  return userService.listAuthenticationMethodTypes({
    userId,
  });
}

export function createServerTransport(token: string, baseUrl: string) {
  return libCreateServerTransport(token, {
    baseUrl,
    interceptors: !process.env.CUSTOM_REQUEST_HEADERS
      ? undefined
      : [
          (next) => {
            return (req) => {
              process.env.CUSTOM_REQUEST_HEADERS!.split(",").forEach((header) => {
                const kv = header.indexOf(":");
                if (kv > 0) {
                  req.header.set(header.slice(0, kv).trim(), header.slice(kv + 1).trim());
                } else {
                  console.warn(`Skipping malformed header: ${header}`);
                }
              });
              return next(req);
            };
          },
        ],
  });
}

/**
 * Check whether a user has an authentication method (TOTP) attached to their account.
 * The current Zitadel API does not include the TOTP name so we can only show whether
 * TOTP is added/enabled or not.
 *
 * @security Requires authenticated session. Use protectedGetTOTPStatus from lib/server/zitadel-protected.ts
 */
export async function getTOTPStatus({
  serviceUrl,
  userId,
}: {
  serviceUrl: string;
  userId: string;
}) {
  const userService: Client<typeof UserService> = await createServiceForHost(
    UserService,
    serviceUrl
  );

  const authMethodsResponse = await userService.listAuthenticationMethodTypes({ userId });
  const authMethodTypes = authMethodsResponse.authMethodTypes ?? [];

  return authMethodTypes.includes(4); // 4 = AuthenticationMethodType.TOTP
}

/**
 * @security Requires authenticated session. Use protectedGetU2FList from lib/server/zitadel-protected.ts
 */
export async function getU2FList({ serviceUrl, userId }: { serviceUrl: string; userId: string }) {
  const userService: Client<typeof UserService> = await createServiceForHost(
    UserService,
    serviceUrl
  );
  const authFactorsResponse = await userService.listAuthenticationFactors({ userId });

  return authFactorsResponse.result
    .filter((factor) => factor.type.case === "u2f")
    .map((factor) => {
      if (factor.type.case === "u2f") {
        return factor.type.value;
      }
      return undefined;
    })
    .filter((token): token is NonNullable<typeof token> => token !== undefined);
}

/**
 * @security Requires authenticated session. Removing MFA devices is sensitive. Use protectedRemoveU2F from lib/server/zitadel-protected.ts
 */
export async function removeU2F({
  serviceUrl,
  userId,
  u2fId,
}: {
  serviceUrl: string;
  userId: string;
  u2fId: string;
}) {
  const userService: Client<typeof UserService> = await createServiceForHost(
    UserService,
    serviceUrl
  );

  return userService.removeU2F({
    userId,
    u2fId,
  });
}

/**
 * @security Requires authenticated session. Removing MFA methods is sensitive. Use protectedRemoveTOTP from lib/server/zitadel-protected.ts
 */
export async function removeTOTP({ serviceUrl, userId }: { serviceUrl: string; userId: string }) {
  const userService: Client<typeof UserService> = await createServiceForHost(
    UserService,
    serviceUrl
  );

  return userService.removeTOTP({
    userId,
  });
}
