import { create } from "@zitadel/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockRedirect } from "@root/test/mocks/next/navigation";
import { createSessionAndUpdateCookie } from "@lib/server/cookie";
import { validateAccountWithPassword, validateCode } from "@lib/validation/validationSchemas";
import { checkEmailVerification } from "@lib/verify-helper";
import {
  addHumanUser,
  getLoginSettings,
  listUsers,
  setPassword,
  updateHuman,
  verifyInviteCode,
} from "@lib/zitadel";

import { setupServerActionContext } from "../../../test/helpers/serverAction";

import { sendVerificationEmail } from "./verify/action";
import { completeInvite } from "./actions";

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
  describe.skip("open registration", () => {
    const baseCommand = {
      email: "person@canada.ca",
      firstName: "Person",
      lastName: "Example",
      password: "P@ssw0rd",
      requestId: "req-123",
    };

    beforeEach(() => {
      vi.clearAllMocks();
      setupServerActionContext();

      vi.mocked(validateAccountWithPassword).mockResolvedValue({ success: true } as never);
      vi.mocked(addHumanUser).mockResolvedValue({ userId: "user-123" } as never);
      vi.mocked(sendVerificationEmail).mockResolvedValue({ success: true });
      vi.mocked(getLoginSettings).mockResolvedValue({
        passwordCheckLifetime: BigInt(600),
        defaultRedirectUri: "https://forms.example",
      } as never);

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

    it("returns generic error when validation fails", async () => {
      vi.mocked(validateAccountWithPassword).mockResolvedValue({ success: false } as never);

      const response = await registerUser(baseCommand);

      expect(response).toEqual({ error: "translated:errors.couldNotCreateUser" });
      expect(addHumanUser).not.toHaveBeenCalled();
      expect(sendVerificationEmail).not.toHaveBeenCalled();
    });

    it("returns generic error when user creation fails", async () => {
      vi.mocked(addHumanUser).mockResolvedValue(undefined as never);

      const response = await registerUser(baseCommand);

      expect(response).toEqual({ error: "translated:errors.couldNotCreateUser" });
      expect(sendVerificationEmail).not.toHaveBeenCalled();
    });

    it("returns session error when session cannot be created", async () => {
      vi.mocked(createSessionAndUpdateCookie).mockResolvedValue({} as never);

      const response = await registerUser(baseCommand);

      expect(response).toEqual({ error: "translated:errors.couldNotCreateSession" });
      expect(sendVerificationEmail).not.toHaveBeenCalled();
    });

    it("returns email verification redirect when required", async () => {
      vi.mocked(checkEmailVerification).mockReturnValue({
        redirect: "/register/verify?requestId=req-123",
      });

      await expect(registerUser(baseCommand)).rejects.toThrow("NEXT_REDIRECT");
      expect(sendVerificationEmail).toHaveBeenCalledExactlyOnceWith();
      const sendOrder = vi.mocked(sendVerificationEmail).mock.invocationCallOrder[0];
      expect(vi.mocked(createSessionAndUpdateCookie).mock.invocationCallOrder[0]).toBeLessThan(
        sendOrder
      );
      expect(sendOrder).toBeLessThan(mockRedirect.mock.invocationCallOrder[0]);
      expect(mockRedirect).toHaveBeenCalledWith("/register/verify?requestId=req-123");
    });

    it("creates session with retry enabled", async () => {
      await expect(registerUser(baseCommand)).rejects.toThrow("NEXT_REDIRECT");

      expect(createSessionAndUpdateCookie).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: "req-123",
          retry: true,
        })
      );
    });
  });
});

describe("completeInvite", () => {
  const baseCommand = {
    email: "person@canada.ca",
    firstName: "Person",
    lastName: "Example",
    password: "P@ssw0rd",
    inviteCode: "invite-code",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setupServerActionContext();

    vi.mocked(validateAccountWithPassword).mockResolvedValue({ success: true } as never);
    vi.mocked(validateCode).mockResolvedValue({ success: true } as never);
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

  it("rejects invalid account or invite-code input before looking up a user", async () => {
    vi.mocked(validateAccountWithPassword).mockResolvedValue({ success: false } as never);

    const response = await completeInvite(baseCommand);

    expect(response).toEqual({ error: "translated:errors.couldNotCreateUser" });
    expect(listUsers).not.toHaveBeenCalled();
    expect(sendVerificationEmail).not.toHaveBeenCalled();
  });

  it("returns a generic error when no invited user matches the email", async () => {
    vi.mocked(listUsers).mockResolvedValue({ result: [] } as never);

    const response = await completeInvite(baseCommand);

    expect(response).toEqual({ error: "translated:errors.couldNotCreateUser" });
    expect(verifyInviteCode).not.toHaveBeenCalled();
    expect(setPassword).not.toHaveBeenCalled();
    expect(sendVerificationEmail).not.toHaveBeenCalled();
  });

  it("does not update the account when its invite code is invalid", async () => {
    vi.mocked(verifyInviteCode).mockResolvedValue(false);

    const response = await completeInvite(baseCommand);

    expect(response).toEqual({ error: "translated:errors.couldNotCreateUser" });
    expect(verifyInviteCode).toHaveBeenCalledWith(baseCommand.inviteCode, "user-123");
    expect(updateHuman).not.toHaveBeenCalled();
    expect(setPassword).not.toHaveBeenCalled();
    expect(sendVerificationEmail).not.toHaveBeenCalled();
  });

  it("updates the invited account, creates a session, and redirects to email verification", async () => {
    await expect(completeInvite(baseCommand)).rejects.toThrow("NEXT_REDIRECT");

    expect(validateAccountWithPassword).toHaveBeenCalledWith({
      email: baseCommand.email,
      firstname: baseCommand.firstName,
      lastname: baseCommand.lastName,
      password: baseCommand.password,
    });
    expect(validateCode).toHaveBeenCalledWith({ code: baseCommand.inviteCode });
    expect(listUsers).toHaveBeenCalledWith({ email: baseCommand.email });
    expect(verifyInviteCode).toHaveBeenCalledWith(baseCommand.inviteCode, "user-123");
    expect(updateHuman).toHaveBeenCalled();
    expect(setPassword).toHaveBeenCalled();
    expect(createSessionAndUpdateCookie).toHaveBeenCalledWith(
      expect.objectContaining({ retry: true })
    );
    expect(checkEmailVerification).toHaveBeenCalledWith(
      expect.objectContaining({ factors: expect.objectContaining({ user: expect.any(Object) }) }),
      undefined
    );
    expect(sendVerificationEmail).toHaveBeenCalledExactlyOnceWith();
    expect(mockRedirect).toHaveBeenCalledWith("/register/verify");
  });

  it("returns a session error and does not send verification email if session creation fails", async () => {
    vi.mocked(createSessionAndUpdateCookie).mockResolvedValue({} as never);

    const response = await completeInvite(baseCommand);

    expect(response).toEqual({ error: "translated:errors.couldNotCreateSession" });
    expect(sendVerificationEmail).not.toHaveBeenCalled();
  });
});
