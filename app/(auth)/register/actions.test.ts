import { create } from "@zitadel/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mockRedirect } from "@root/test/mocks/next/navigation";
import { createSessionAndUpdateCookie } from "@lib/server/cookie";
import { validateAccountWithPassword, validateCode } from "@lib/validation/validationSchemas";
import { checkEmailVerification } from "@lib/verify-helper";
import { addHumanUser, listUsers, setPassword, updateHuman, verifyInviteCode } from "@lib/zitadel";

import { setupServerActionContext } from "../../../test/helpers/serverAction";

import { sendVerificationEmail } from "./verify/action";
import { registerUser } from "./actions";

vi.mock("./verify/action", () => ({
  sendVerificationEmail: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

vi.mock("@zitadel/client", () => ({
  create: vi.fn(),
}));

vi.mock("@lib/server/cookie", () => ({
  createSessionAndUpdateCookie: vi.fn(),
}));

vi.mock("@lib/service-url", () => ({
  getServiceUrlFromHeaders: vi.fn(),
}));

vi.mock("@lib/validation/validationSchemas", () => ({
  validateAccountWithPassword: vi.fn(),
  validateCode: vi.fn(),
}));

vi.mock("@lib/verify-helper", () => ({
  checkEmailVerification: vi.fn(),
}));

vi.mock("@lib/zitadel", () => ({
  listUsers: vi.fn(),
  setPassword: vi.fn(),
  updateHuman: vi.fn(),
  verifyInviteCode: vi.fn(),
  addHumanUser: vi.fn(),
  getLoginSettings: vi.fn(),
}));

vi.mock("@i18n/server", () => ({
  serverTranslation: vi.fn(),
}));

vi.mock("@lib/logger", () => ({
  logMessage: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("registration", () => {
  const openRegistrationCommand = {
    email: "person@canada.ca",
    firstName: "Person",
    lastName: "Example",
    password: "P@ssw0rd",
    requestId: "req-123",
  };

  const inviteCommand = {
    ...openRegistrationCommand,
    inviteCode: "0A0A0A",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("OPEN_REGISTRATION", "true");
    setupServerActionContext();

    vi.mocked(validateAccountWithPassword).mockResolvedValue({ success: true } as never);
    vi.mocked(validateCode).mockResolvedValue({ success: true } as never);
    vi.mocked(addHumanUser).mockResolvedValue({ userId: "user-123" } as never);
    vi.mocked(listUsers).mockResolvedValue({ result: [{ userId: "user-123" }] } as never);
    vi.mocked(verifyInviteCode).mockResolvedValue(true);
    vi.mocked(sendVerificationEmail).mockResolvedValue({ success: true });
    vi.mocked(checkEmailVerification).mockReturnValue({ redirect: "/register/verify" });
    vi.mocked(create).mockReturnValue({ checks: "value" } as never);
    vi.mocked(createSessionAndUpdateCookie).mockResolvedValue({
      id: "session-123",
      factors: {
        user: {
          id: "user-123",
          loginName: "person@canada.ca",
        },
      },
    } as never);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("OPEN_REGISTRATION switch", () => {
    it.each([
      ["unset", undefined],
      ["false", "false"],
      ["uppercase TRUE", "TRUE"],
      ["another truthy string", "1"],
    ])("rejects registration without an invite when OPEN_REGISTRATION is %s", async (_, value) => {
      vi.stubEnv("OPEN_REGISTRATION", value);

      const response = await registerUser(openRegistrationCommand);

      expect(response).toEqual({ error: "translated:errors.couldNotCreateUser" });
      expect(validateAccountWithPassword).not.toHaveBeenCalled();
      expect(addHumanUser).not.toHaveBeenCalled();
      expect(listUsers).not.toHaveBeenCalled();
      expect(createSessionAndUpdateCookie).not.toHaveBeenCalled();
    });

    it("allows open registration only when OPEN_REGISTRATION is exactly true", async () => {
      vi.stubEnv("OPEN_REGISTRATION", "true");

      await expect(registerUser(openRegistrationCommand)).rejects.toThrow("NEXT_REDIRECT");

      expect(validateAccountWithPassword).toHaveBeenCalledWith({
        email: openRegistrationCommand.email,
        firstname: openRegistrationCommand.firstName,
        lastname: openRegistrationCommand.lastName,
        password: openRegistrationCommand.password,
      });
      expect(addHumanUser).toHaveBeenCalledWith({
        email: openRegistrationCommand.email,
        firstName: openRegistrationCommand.firstName,
        lastName: openRegistrationCommand.lastName,
        password: openRegistrationCommand.password,
      });
      expect(listUsers).not.toHaveBeenCalled();
      expect(mockRedirect).toHaveBeenCalledWith("/register/verify");
    });

    it("routes to invite completion when registration is closed and an invite code is provided", async () => {
      vi.stubEnv("OPEN_REGISTRATION", "false");

      await expect(registerUser(inviteCommand)).rejects.toThrow("NEXT_REDIRECT");

      expect(validateAccountWithPassword).toHaveBeenCalledWith({
        email: inviteCommand.email,
        firstname: inviteCommand.firstName,
        lastname: inviteCommand.lastName,
        password: inviteCommand.password,
      });
      expect(validateCode).toHaveBeenCalledWith({ code: inviteCommand.inviteCode });
      expect(listUsers).toHaveBeenCalledWith({ email: inviteCommand.email });
      expect(verifyInviteCode).toHaveBeenCalledWith(inviteCommand.inviteCode, "user-123");
      expect(updateHuman).toHaveBeenCalled();
      expect(setPassword).toHaveBeenCalled();
      expect(addHumanUser).not.toHaveBeenCalled();
      expect(createSessionAndUpdateCookie).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: undefined, retry: true })
      );
      expect(sendVerificationEmail).toHaveBeenCalledExactlyOnceWith();
      expect(mockRedirect).toHaveBeenCalledWith("/register/verify");
    });
  });

  describe("open registration", () => {
    it("returns a generic error when account validation fails", async () => {
      vi.mocked(validateAccountWithPassword).mockResolvedValue({ success: false } as never);

      const response = await registerUser(openRegistrationCommand);

      expect(response).toEqual({ error: "translated:errors.couldNotCreateUser" });
      expect(addHumanUser).not.toHaveBeenCalled();
      expect(sendVerificationEmail).not.toHaveBeenCalled();
    });

    it("returns a generic error when user creation fails", async () => {
      vi.mocked(addHumanUser).mockResolvedValue(undefined as never);

      const response = await registerUser(openRegistrationCommand);

      expect(response).toEqual({ error: "translated:errors.couldNotCreateUser" });
      expect(createSessionAndUpdateCookie).not.toHaveBeenCalled();
      expect(sendVerificationEmail).not.toHaveBeenCalled();
    });

    it("returns a session error when no user session is created", async () => {
      vi.mocked(createSessionAndUpdateCookie).mockResolvedValue({} as never);

      const response = await registerUser(openRegistrationCommand);

      expect(response).toEqual({ error: "translated:errors.couldNotCreateSession" });
      expect(sendVerificationEmail).not.toHaveBeenCalled();
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it("creates a retryable session, sends verification, and redirects with the request ID", async () => {
      vi.mocked(checkEmailVerification).mockReturnValue({
        redirect: "/register/verify?requestId=req-123",
      });

      await expect(registerUser(openRegistrationCommand)).rejects.toThrow("NEXT_REDIRECT");

      expect(createSessionAndUpdateCookie).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: "req-123", retry: true })
      );
      expect(checkEmailVerification).toHaveBeenCalledWith(expect.any(Object), undefined, "req-123");
      expect(sendVerificationEmail).toHaveBeenCalledExactlyOnceWith();
      expect(mockRedirect).toHaveBeenCalledWith("/register/verify?requestId=req-123");
      expect(vi.mocked(createSessionAndUpdateCookie).mock.invocationCallOrder[0]).toBeLessThan(
        vi.mocked(sendVerificationEmail).mock.invocationCallOrder[0]
      );
      expect(vi.mocked(sendVerificationEmail).mock.invocationCallOrder[0]).toBeLessThan(
        mockRedirect.mock.invocationCallOrder[0]
      );
    });

    it("returns a registration error when sending the verification email throws", async () => {
      vi.mocked(sendVerificationEmail).mockRejectedValue(new Error("email service unavailable"));

      const response = await registerUser(openRegistrationCommand);

      expect(response).toEqual({ error: "translated:errors.couldNotRegisterUser" });
      expect(mockRedirect).not.toHaveBeenCalled();
    });
  });

  describe("invite completion when registration is closed", () => {
    beforeEach(() => {
      vi.stubEnv("OPEN_REGISTRATION", "false");
    });

    it("rejects invalid account or invite-code input before looking up a user", async () => {
      vi.mocked(validateAccountWithPassword).mockResolvedValue({ success: false } as never);

      const response = await registerUser(inviteCommand);

      expect(response).toEqual({ error: "translated:errors.couldNotCreateUser" });
      expect(listUsers).not.toHaveBeenCalled();
      expect(sendVerificationEmail).not.toHaveBeenCalled();
    });

    it("returns a generic error when no invited user matches the email", async () => {
      vi.mocked(listUsers).mockResolvedValue({ result: [] } as never);

      const response = await registerUser(inviteCommand);

      expect(response).toEqual({ error: "translated:errors.couldNotCreateUser" });
      expect(verifyInviteCode).not.toHaveBeenCalled();
      expect(setPassword).not.toHaveBeenCalled();
      expect(sendVerificationEmail).not.toHaveBeenCalled();
    });

    it("does not update the account when its invite code is invalid", async () => {
      vi.mocked(verifyInviteCode).mockResolvedValue(false);

      const response = await registerUser(inviteCommand);

      expect(response).toEqual({ error: "translated:errors.couldNotCreateUser" });
      expect(verifyInviteCode).toHaveBeenCalledWith(inviteCommand.inviteCode, "user-123");
      expect(updateHuman).not.toHaveBeenCalled();
      expect(setPassword).not.toHaveBeenCalled();
      expect(sendVerificationEmail).not.toHaveBeenCalled();
    });

    it("returns a session error without sending verification when session creation fails", async () => {
      vi.mocked(createSessionAndUpdateCookie).mockResolvedValue({} as never);

      const response = await registerUser(inviteCommand);

      expect(response).toEqual({ error: "translated:errors.couldNotCreateSession" });
      expect(sendVerificationEmail).not.toHaveBeenCalled();
    });
  });
});
