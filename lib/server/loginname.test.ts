import { PasskeysType } from "@zitadel/proto/zitadel/settings/v2/login_settings_pb";
import { UserState } from "@zitadel/proto/zitadel/user/v2/user_pb";
import { AuthenticationMethodType } from "@zitadel/proto/zitadel/user/v2/user_service_pb";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { sendLoginname } from "./loginname";

type WithRedirect = { redirect: string };

/*--------------------------------------------*
 * Mock all dependencies
 *--------------------------------------------*/

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

vi.mock("@zitadel/client", () => ({
  create: vi.fn(),
}));

vi.mock("@i18n/server", () => ({
  serverTranslation: vi.fn(),
}));

vi.mock("@lib/service-url", () => ({
  getServiceUrlFromHeaders: vi.fn(),
}));

vi.mock("@lib/idp", () => ({
  idpTypeToIdentityProviderType: vi.fn(),
  idpTypeToSlug: vi.fn(),
}));

vi.mock("@lib/zitadel", () => ({
  getActiveIdentityProviders: vi.fn(),
  getIDPByID: vi.fn(),
  getLoginSettings: vi.fn(),
  getOrgsByDomain: vi.fn(),
  listAuthenticationMethodTypes: vi.fn(),
  listIDPLinks: vi.fn(),
  searchUsers: vi.fn(),
  startIdentityProviderFlow: vi.fn(),
}));

vi.mock("./cookie", () => ({
  createSessionAndUpdateCookie: vi.fn(),
}));

vi.mock("./host", () => ({
  getOriginalHost: vi.fn(),
}));

/*--------------------------------------------*
 * Test setup
 *--------------------------------------------*/

const TEST_SERVICE_URL = "https://api.example.com";

describe("sendLoginname", () => {
  let mockHeaders: ReturnType<typeof vi.fn>;
  let mockCreate: ReturnType<typeof vi.fn>;
  let mockGetServiceUrlFromHeaders: ReturnType<typeof vi.fn>;
  let mockServerTranslation: ReturnType<typeof vi.fn>;
  let mockGetLoginSettings: ReturnType<typeof vi.fn>;
  let mockSearchUsers: ReturnType<typeof vi.fn>;
  let mockCreateSessionAndUpdateCookie: ReturnType<typeof vi.fn>;
  let mockListAuthenticationMethodTypes: ReturnType<typeof vi.fn>;
  let mockListIDPLinks: ReturnType<typeof vi.fn>;
  let mockGetOriginalHost: ReturnType<typeof vi.fn>;
  let mockStartIdentityProviderFlow: ReturnType<typeof vi.fn>;
  let mockGetActiveIdentityProviders: ReturnType<typeof vi.fn>;
  let mockGetIDPByID: ReturnType<typeof vi.fn>;
  let mockIdpTypeToSlug: ReturnType<typeof vi.fn>;
  let mockGetOrgsByDomain: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    const { headers } = await import("next/headers");
    const { create } = await import("@zitadel/client");
    const { serverTranslation } = await import("@i18n/server");
    const { getServiceUrlFromHeaders } = await import("@lib/service-url");
    const {
      getLoginSettings,
      searchUsers,
      listAuthenticationMethodTypes,
      listIDPLinks,
      startIdentityProviderFlow,
      getActiveIdentityProviders,
      getOrgsByDomain,
      getIDPByID,
    } = await import("@lib/zitadel");
    const { createSessionAndUpdateCookie } = await import("./cookie");
    const { getOriginalHost } = await import("./host");
    const { idpTypeToSlug } = await import("@lib/idp");

    mockHeaders = vi.mocked(headers);
    mockCreate = vi.mocked(create);
    mockServerTranslation = vi.mocked(serverTranslation);
    mockGetServiceUrlFromHeaders = vi.mocked(getServiceUrlFromHeaders);
    mockGetLoginSettings = vi.mocked(getLoginSettings);
    mockSearchUsers = vi.mocked(searchUsers);
    mockCreateSessionAndUpdateCookie = vi.mocked(createSessionAndUpdateCookie);
    mockListAuthenticationMethodTypes = vi.mocked(listAuthenticationMethodTypes);
    mockListIDPLinks = vi.mocked(listIDPLinks);
    mockGetOriginalHost = vi.mocked(getOriginalHost);
    mockStartIdentityProviderFlow = vi.mocked(startIdentityProviderFlow);
    mockGetActiveIdentityProviders = vi.mocked(getActiveIdentityProviders);
    mockGetIDPByID = vi.mocked(getIDPByID);
    mockIdpTypeToSlug = vi.mocked(idpTypeToSlug);
    mockGetOrgsByDomain = vi.mocked(getOrgsByDomain);

    // Default implementations
    mockHeaders.mockResolvedValue(new Headers());
    mockGetServiceUrlFromHeaders.mockReturnValue({ serviceUrl: TEST_SERVICE_URL });
    // i18n: return the key itself so assertions can match on key strings
    mockServerTranslation.mockResolvedValue({ t: (key: string) => key });
    mockGetOriginalHost.mockResolvedValue("example.com");
    mockIdpTypeToSlug.mockReturnValue("google");
    mockGetIDPByID.mockResolvedValue({ id: "idp123", name: "Google", type: "GOOGLE" });
    mockGetOrgsByDomain.mockResolvedValue({ result: [] });
    mockCreate.mockReturnValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /*--------------------------------------------*
   * Error cases
   *--------------------------------------------*/

  describe("Error cases", () => {
    test("should return error when login settings cannot be retrieved", async () => {
      mockGetLoginSettings.mockResolvedValue(null);

      const result = await sendLoginname({ loginName: "user@example.com" });

      expect(result).toEqual({ error: "errors.couldNotGetLoginSettings" });
    });

    test("should return error when user search itself returns an error", async () => {
      mockGetLoginSettings.mockResolvedValue({ allowUsernamePassword: true });
      mockSearchUsers.mockResolvedValue({ error: "Search failed" });

      const result = await sendLoginname({ loginName: "user@example.com" });

      expect(result).toEqual({ error: "Search failed" });
    });

    test("should return error when search result has no result field", async () => {
      mockGetLoginSettings.mockResolvedValue({ allowUsernamePassword: true });
      mockSearchUsers.mockResolvedValue({});

      const result = await sendLoginname({ loginName: "user@example.com" });

      expect(result).toEqual({ error: "errors.couldNotSearchUsers" });
    });

    test("should return error when more than one user is found", async () => {
      mockGetLoginSettings.mockResolvedValue({ allowUsernamePassword: true });
      mockSearchUsers.mockResolvedValue({
        result: [
          { userId: "user1", preferredLoginName: "user1@example.com" },
          { userId: "user2", preferredLoginName: "user2@example.com" },
        ],
      });

      const result = await sendLoginname({ loginName: "user@example.com" });

      expect(result).toEqual({ error: "errors.moreThanOneUserFound" });
    });
  });

  /*--------------------------------------------*
   * Single user found — authentication method routing
   *--------------------------------------------*/

  describe("Single user found - authentication method handling", () => {
    const mockUser = {
      userId: "user123",
      preferredLoginName: "user@example.com",
      details: { resourceOwner: "org123" },
      type: { case: "human", value: { email: { email: "user@example.com" } } },
      state: UserState.ACTIVE,
    };

    // createSessionAndUpdateCookie returns Session directly (not { session, sessionCookie })
    const mockSession = {
      factors: {
        user: {
          id: "user123",
          loginName: "user@example.com",
          organizationId: "org123",
        },
      },
    };

    beforeEach(() => {
      mockGetLoginSettings.mockResolvedValue({ allowUsernamePassword: true });
      mockSearchUsers.mockResolvedValue({ result: [mockUser] });
      mockCreateSessionAndUpdateCookie.mockResolvedValue(mockSession);
    });

    test("should redirect to /verify when user has no authentication methods", async () => {
      mockListAuthenticationMethodTypes.mockResolvedValue({ authMethodTypes: [] });

      const result = await sendLoginname({
        loginName: "user@example.com",
        requestId: "req123",
      });

      expect(result).toHaveProperty("redirect");
      expect((result as WithRedirect).redirect).toMatch(/^\/verify\?/);
      expect((result as WithRedirect).redirect).not.toContain("loginName=");
      expect((result as WithRedirect).redirect).toContain("send=true");
      expect((result as WithRedirect).redirect).toContain("invite=true");
      expect((result as WithRedirect).redirect).toContain("requestId=req123");
    });

    describe("Single authentication method", () => {
      test("should redirect to /password when user has only password and it is allowed", async () => {
        mockListAuthenticationMethodTypes.mockResolvedValue({
          authMethodTypes: [AuthenticationMethodType.PASSWORD],
        });

        const result = await sendLoginname({
          loginName: "user@example.com",
          requestId: "req123",
        });

        expect(result).toHaveProperty("redirect");
        expect((result as WithRedirect).redirect).toMatch(/^\/password\?/);
        expect((result as WithRedirect).redirect).toContain("loginName=user%40example.com");
        expect((result as WithRedirect).redirect).toContain("requestId=req123");
      });

      test("should attempt IDP redirect when password is not allowed but user has IDP links", async () => {
        mockGetLoginSettings.mockResolvedValue({ allowUsernamePassword: false });
        mockListAuthenticationMethodTypes.mockResolvedValue({
          authMethodTypes: [AuthenticationMethodType.PASSWORD],
        });
        mockListIDPLinks.mockResolvedValue({ result: [{ idpId: "idp123" }] });
        mockStartIdentityProviderFlow.mockResolvedValue("https://idp.example.com/auth");

        const result = await sendLoginname({ loginName: "user@example.com" });

        expect(result).toEqual({ redirect: "https://idp.example.com/auth" });
        expect(mockListIDPLinks).toHaveBeenCalledWith({
          serviceUrl: TEST_SERVICE_URL,
          userId: "user123",
        });
      });

      test("should return error when password not allowed and no IDP available", async () => {
        mockGetLoginSettings.mockResolvedValue({ allowUsernamePassword: false });
        mockListAuthenticationMethodTypes.mockResolvedValue({
          authMethodTypes: [AuthenticationMethodType.PASSWORD],
        });
        mockListIDPLinks.mockResolvedValue({ result: [] });
        mockGetActiveIdentityProviders.mockResolvedValue({ identityProviders: [] });

        const result = await sendLoginname({ loginName: "user@example.com" });

        expect(result).toEqual({ error: "errors.usernamePasswordNotAllowed" });
      });

      test("should redirect to org IDP when password not allowed, no user IDP links, but org has a single active IDP", async () => {
        mockGetLoginSettings.mockResolvedValue({ allowUsernamePassword: false });
        mockListAuthenticationMethodTypes.mockResolvedValue({
          authMethodTypes: [AuthenticationMethodType.PASSWORD],
        });
        mockListIDPLinks.mockResolvedValue({ result: [] });
        mockGetActiveIdentityProviders.mockResolvedValue({
          identityProviders: [{ id: "org-idp-123", type: 0 }],
        });
        mockIdpTypeToSlug.mockReturnValue("google");
        mockStartIdentityProviderFlow.mockResolvedValue("https://org-idp.example.com/auth");

        const result = await sendLoginname({ loginName: "user@example.com" });

        expect(result).toEqual({ redirect: "https://org-idp.example.com/auth" });
        expect(mockGetActiveIdentityProviders).toHaveBeenCalledWith({
          serviceUrl: TEST_SERVICE_URL,
          orgId: "org123",
        });
      });

      test("should redirect to /passkey when user has only passkey and it is allowed", async () => {
        mockGetLoginSettings.mockResolvedValue({
          passkeysType: PasskeysType.ALLOWED,
          allowUsernamePassword: true,
        });
        mockListAuthenticationMethodTypes.mockResolvedValue({
          authMethodTypes: [AuthenticationMethodType.PASSKEY],
        });

        const result = await sendLoginname({
          loginName: "user@example.com",
          requestId: "req123",
        });

        expect(result).toHaveProperty("redirect");
        expect((result as WithRedirect).redirect).toMatch(/^\/passkey\?/);
        expect((result as WithRedirect).redirect).toContain("loginName=user%40example.com");
        expect((result as WithRedirect).redirect).toContain("requestId=req123");
      });

      test("should return error when user has only passkey but passkeys are NOT_ALLOWED", async () => {
        mockGetLoginSettings.mockResolvedValue({ passkeysType: PasskeysType.NOT_ALLOWED });
        mockListAuthenticationMethodTypes.mockResolvedValue({
          authMethodTypes: [AuthenticationMethodType.PASSKEY],
        });

        const result = await sendLoginname({ loginName: "user@example.com" });

        expect(result).toEqual({ error: "errors.passkeysNotAllowed" });
      });

      test("should redirect to IDP when user has only IDP method", async () => {
        mockListAuthenticationMethodTypes.mockResolvedValue({
          authMethodTypes: [AuthenticationMethodType.IDP],
        });
        mockListIDPLinks.mockResolvedValue({ result: [{ idpId: "idp123" }] });
        mockStartIdentityProviderFlow.mockResolvedValue("https://idp.example.com/auth");

        const result = await sendLoginname({ loginName: "user@example.com" });

        expect(result).toEqual({ redirect: "https://idp.example.com/auth" });
      });
    });

    describe("Multiple authentication methods", () => {
      test("should prefer passkey over password when both are available", async () => {
        mockGetLoginSettings.mockResolvedValue({
          passkeysType: PasskeysType.ALLOWED,
          allowUsernamePassword: true,
        });
        mockListAuthenticationMethodTypes.mockResolvedValue({
          authMethodTypes: [AuthenticationMethodType.PASSWORD, AuthenticationMethodType.PASSKEY],
        });

        const result = await sendLoginname({ loginName: "user@example.com" });

        expect(result).toHaveProperty("redirect");
        expect((result as WithRedirect).redirect).toMatch(/^\/passkey\?/);
        expect((result as WithRedirect).redirect).toContain("altPassword=true");
      });

      test("should redirect to IDP when no passkey but IDP is available", async () => {
        mockListAuthenticationMethodTypes.mockResolvedValue({
          authMethodTypes: [AuthenticationMethodType.PASSWORD, AuthenticationMethodType.IDP],
        });
        mockListIDPLinks.mockResolvedValue({ result: [{ idpId: "idp123" }] });
        mockStartIdentityProviderFlow.mockResolvedValue("https://idp.example.com/auth");

        const result = await sendLoginname({ loginName: "user@example.com" });

        expect(result).toEqual({ redirect: "https://idp.example.com/auth" });
      });

      test("should redirect to /password when only password is available and allowed", async () => {
        mockGetLoginSettings.mockResolvedValue({ allowUsernamePassword: true });
        mockListAuthenticationMethodTypes.mockResolvedValue({
          authMethodTypes: [AuthenticationMethodType.PASSWORD],
        });

        const result = await sendLoginname({ loginName: "user@example.com" });

        expect(result).toHaveProperty("redirect");
        expect((result as WithRedirect).redirect).toMatch(/^\/password\?/);
      });

      test("should return error when password is available but allowUsernamePassword is false", async () => {
        mockGetLoginSettings.mockResolvedValue({ allowUsernamePassword: false });
        mockListAuthenticationMethodTypes.mockResolvedValue({
          authMethodTypes: [AuthenticationMethodType.PASSWORD],
        });
        mockListIDPLinks.mockResolvedValue({ result: [] });
        mockGetActiveIdentityProviders.mockResolvedValue({ identityProviders: [] });

        const result = await sendLoginname({ loginName: "user@example.com" });

        expect(result).toEqual({ error: "errors.usernamePasswordNotAllowed" });
      });
    });
  });

  /*--------------------------------------------*
   * User not found — registration and org discovery
   *--------------------------------------------*/

  describe("User not found scenarios", () => {
    beforeEach(() => {
      mockSearchUsers.mockResolvedValue({ result: [] });
    });

    test("should return error when user not found and registration is disabled", async () => {
      mockGetLoginSettings.mockResolvedValue({
        allowRegister: false,
        allowUsernamePassword: true,
      });

      const result = await sendLoginname({ loginName: "user@example.com" });

      expect(result).toEqual({ error: "errors.userNotFound" });
    });

    test("should redirect to /register when both registration and password are allowed", async () => {
      mockGetLoginSettings.mockResolvedValue({
        allowRegister: true,
        allowUsernamePassword: true,
        ignoreUnknownUsernames: false,
      });

      const result = await sendLoginname({
        loginName: "user@example.com",
        organization: "org123",
        requestId: "req123",
      });

      expect(result).toHaveProperty("redirect");
      expect((result as WithRedirect).redirect).toMatch(/^\/register\?/);
      expect((result as WithRedirect).redirect).toContain("organization=org123");
      expect((result as WithRedirect).redirect).toContain("requestId=req123");
      expect((result as WithRedirect).redirect).toContain("email=user%40example.com");
    });

    test("should redirect to IDP when registration is allowed but password is not allowed", async () => {
      mockGetLoginSettings.mockResolvedValue({
        allowRegister: true,
        allowUsernamePassword: false,
      });
      mockGetActiveIdentityProviders.mockResolvedValue({
        identityProviders: [{ id: "idp123", type: "OIDC" }],
      });
      mockStartIdentityProviderFlow.mockResolvedValue("https://idp.example.com/auth");

      const result = await sendLoginname({ loginName: "user@example.com" });

      expect(result).toEqual({ redirect: "https://idp.example.com/auth" });
    });

    test("should redirect to /password when ignoreUnknownUsernames is true", async () => {
      mockGetLoginSettings.mockResolvedValue({ ignoreUnknownUsernames: true });

      const result = await sendLoginname({
        loginName: "user@example.com",
        requestId: "req123",
        organization: "org123",
      });

      expect(result).toHaveProperty("redirect");
      expect((result as WithRedirect).redirect).toMatch(/^\/password\?/);
      expect((result as WithRedirect).redirect).toContain("loginName=user%40example.com");
      expect((result as WithRedirect).redirect).toContain("requestId=req123");
      expect((result as WithRedirect).redirect).toContain("organization=org123");
    });

    test("should discover org from domain suffix when user not found and no org context provided", async () => {
      mockGetLoginSettings
        .mockResolvedValueOnce({
          allowRegister: true,
          allowUsernamePassword: true,
          ignoreUnknownUsernames: false,
        })
        .mockResolvedValueOnce({
          allowDomainDiscovery: true,
          allowRegister: true,
          allowUsernamePassword: true,
          ignoreUnknownUsernames: false,
        });

      mockGetOrgsByDomain.mockResolvedValue({
        result: [{ id: "discovered-org-123", name: "Example Org" }],
      });

      const result = await sendLoginname({
        loginName: "user@example.com",
        requestId: "req123",
      });

      expect(result).toHaveProperty("redirect");
      expect((result as WithRedirect).redirect).toMatch(/^\/register\?/);
      expect((result as WithRedirect).redirect).toContain("organization=discovered-org-123");
      expect((result as WithRedirect).redirect).toContain("requestId=req123");
      expect((result as WithRedirect).redirect).toContain("email=user%40example.com");

      expect(mockGetOrgsByDomain).toHaveBeenCalledWith({
        serviceUrl: TEST_SERVICE_URL,
        domain: "example.com",
      });
    });

    test("should redirect to IDP with discovered org when password not allowed", async () => {
      mockGetLoginSettings
        .mockResolvedValueOnce({ allowRegister: true, allowUsernamePassword: false })
        .mockResolvedValueOnce({
          allowDomainDiscovery: true,
          allowRegister: true,
          allowUsernamePassword: false,
        });

      mockGetOrgsByDomain.mockResolvedValue({
        result: [{ id: "discovered-org-456", name: "Example Org" }],
      });
      mockGetActiveIdentityProviders.mockResolvedValue({
        identityProviders: [{ id: "idp123", type: "OIDC" }],
      });
      mockStartIdentityProviderFlow.mockResolvedValue("https://idp.example.com/auth");

      const result = await sendLoginname({
        loginName: "user@company.com",
        requestId: "req123",
      });

      expect(result).toEqual({ redirect: "https://idp.example.com/auth" });
      expect(mockGetOrgsByDomain).toHaveBeenCalledWith({
        serviceUrl: TEST_SERVICE_URL,
        domain: "company.com",
      });
      expect(mockGetActiveIdentityProviders).toHaveBeenCalledWith({
        serviceUrl: TEST_SERVICE_URL,
        orgId: "discovered-org-456",
      });
    });

    test("should not use org discovery if domain discovery is disabled for the org", async () => {
      mockGetLoginSettings
        .mockResolvedValueOnce({
          allowRegister: true,
          allowUsernamePassword: true,
          ignoreUnknownUsernames: false,
        })
        .mockResolvedValueOnce({ allowDomainDiscovery: false });

      mockGetOrgsByDomain.mockResolvedValue({
        result: [{ id: "10987654321", name: "Example Org" }],
      });

      const result = await sendLoginname({ loginName: "user@example.com" });

      expect(result).toEqual({ error: "errors.userNotFound" });
    });

    test("should not use org discovery when multiple orgs match the domain", async () => {
      mockGetLoginSettings.mockResolvedValue({
        allowRegister: true,
        allowUsernamePassword: true,
        ignoreUnknownUsernames: false,
      });

      mockGetOrgsByDomain.mockResolvedValue({
        result: [
          { id: "12345678910", name: "Example Org 1" },
          { id: "10987654321", name: "Example Org 2" },
        ],
      });

      const result = await sendLoginname({ loginName: "user@example.com" });

      expect(result).toEqual({ error: "errors.userNotFound" });
    });

    test("should use provided org context instead of discovering when org param is present", async () => {
      mockGetLoginSettings.mockResolvedValue({
        allowRegister: true,
        allowUsernamePassword: true,
        ignoreUnknownUsernames: false,
      });

      const result = await sendLoginname({
        loginName: "user@example.com",
        organization: "123456",
        requestId: "req123",
      });

      expect(result).toHaveProperty("redirect");
      expect((result as WithRedirect).redirect).toMatch(/^\/register\?/);
      expect((result as WithRedirect).redirect).toContain("organization=123456");
      expect(mockGetOrgsByDomain).not.toHaveBeenCalled();
    });
  });

  /*--------------------------------------------*
   * Edge cases
   *--------------------------------------------*/

  describe("Edge cases", () => {
    test("should return error for INITIAL user state", async () => {
      const mockUser = {
        userId: "user123",
        preferredLoginName: "user@example.com",
        details: { resourceOwner: "org123" },
        type: { case: "human", value: { email: { email: "user@example.com" } } },
        state: UserState.INITIAL,
      };
      const mockSession = {
        factors: {
          user: { id: "user123", loginName: "user@example.com", organizationId: "org123" },
        },
      };

      mockGetLoginSettings.mockResolvedValue({ allowUsernamePassword: true });
      mockSearchUsers.mockResolvedValue({ result: [mockUser] });
      mockCreateSessionAndUpdateCookie.mockResolvedValue(mockSession);

      const result = await sendLoginname({ loginName: "user@example.com" });

      expect(result).toEqual({ error: "errors.initialUserNotSupported" });
    });

    test("should include organization and requestId in all redirects", async () => {
      const mockUser = {
        userId: "user123",
        preferredLoginName: "user@example.com",
        details: { resourceOwner: "org123" },
        type: { case: "human", value: { email: { email: "user@example.com" } } },
        state: UserState.ACTIVE,
      };
      const mockSession = {
        factors: {
          user: { id: "user123", loginName: "user@example.com", organizationId: "org123" },
        },
      };

      mockGetLoginSettings.mockResolvedValue({ allowUsernamePassword: true });
      mockSearchUsers.mockResolvedValue({ result: [mockUser] });
      mockCreateSessionAndUpdateCookie.mockResolvedValue(mockSession);
      mockListAuthenticationMethodTypes.mockResolvedValue({
        authMethodTypes: [AuthenticationMethodType.PASSWORD],
      });

      const result = await sendLoginname({
        loginName: "user@example.com",
        organization: "custom-org",
        requestId: "req123",
      });

      expect(result).toHaveProperty("redirect");
      expect((result as WithRedirect).redirect).toContain("organization=custom-org");
      expect((result as WithRedirect).redirect).toContain("requestId=req123");
    });

    // Regression test: https://github.com/zitadel/zitadel/issues/11518
    // When preferredLoginName (e.g. username@org-domain) differs from the user's email,
    // logging in with the email while disableLoginWithPhone=true must NOT be blocked.
    test("should allow login with email when disableLoginWithPhone is true and preferredLoginName differs from email", async () => {
      const mockUser = {
        userId: "user123",
        preferredLoginName: "user@orgdomain.com",
        details: { resourceOwner: "org123" },
        type: {
          case: "human",
          value: { email: { email: "user@test.com" }, phone: { phone: "+1234567890" } },
        },
        state: UserState.ACTIVE,
      };
      const mockSession = {
        factors: {
          user: { id: "user123", loginName: "user@orgdomain.com", organizationId: "org123" },
        },
      };

      mockSearchUsers.mockResolvedValue({ result: [mockUser] });
      mockGetLoginSettings.mockResolvedValue({
        disableLoginWithPhone: true,
        allowUsernamePassword: true,
      });
      mockCreateSessionAndUpdateCookie.mockResolvedValue(mockSession);
      mockListAuthenticationMethodTypes.mockResolvedValue({
        authMethodTypes: [AuthenticationMethodType.PASSWORD],
      });

      const result = await sendLoginname({ loginName: "user@test.com" });

      // Must NOT return "User not found" — email login must be allowed when only phone is disabled
      expect(result).not.toEqual({ error: "errors.userNotFound" });
      expect(mockCreateSessionAndUpdateCookie).toHaveBeenCalled();
    });

    test("should block login with phone number when disableLoginWithPhone is true", async () => {
      const mockUser = {
        userId: "user123",
        preferredLoginName: "user@orgdomain.com",
        details: { resourceOwner: "org123" },
        type: {
          case: "human",
          value: { email: { email: "user@example.com" }, phone: { phone: "+1234567890" } },
        },
        state: UserState.ACTIVE,
      };

      mockSearchUsers.mockResolvedValue({ result: [mockUser] });
      mockGetLoginSettings.mockResolvedValue({ disableLoginWithPhone: true });

      const result = await sendLoginname({ loginName: "+1234567890" });

      expect(result).toEqual({ error: "errors.userNotFound" });
      expect(mockCreateSessionAndUpdateCookie).not.toHaveBeenCalled();
    });

    test("should return error for inactive user", async () => {
      mockGetLoginSettings.mockResolvedValue({ allowUsernamePassword: true });
      mockSearchUsers.mockResolvedValue({
        result: [
          {
            userId: "user123",
            preferredLoginName: "user@example.com",
            details: { resourceOwner: "org123" },
            type: { case: "human", value: { email: { email: "user@example.com" } } },
            state: UserState.ACTIVE,
          },
        ],
      });
      mockCreateSessionAndUpdateCookie.mockRejectedValue({
        rawMessage: "Errors.User.NotActive (SESSION-Gj4ko)",
      });

      const result = await sendLoginname({ loginName: "user@example.com" });

      expect(result).toEqual({ error: "errors.userNotActive" });
    });
  });
});
