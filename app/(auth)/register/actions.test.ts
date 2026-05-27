import { create } from "@zitadel/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { completeFlowOrGetUrl } from "@lib/client/flow";
import { validateAccountWithPassword } from "@lib/client/validationSchemas";
import { createSessionAndUpdateCookie } from "@lib/server/cookie";
import { checkEmailVerification } from "@lib/verify-helper";
import { addHumanUser, getLoginSettings, getUserByID } from "@lib/zitadel";

import { setupServerActionContext } from "../../../test/helpers/serverAction";

import { registerUser } from "./actions";

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

vi.mock("@zitadel/client", () => ({
  create: vi.fn(),
}));

vi.mock("@lib/client", () => ({
  completeFlowOrGetUrl: vi.fn(),
}));

vi.mock("@lib/server/cookie", () => ({
  createSessionAndUpdateCookie: vi.fn(),
}));

vi.mock("@lib/service-url", () => ({
  getServiceUrlFromHeaders: vi.fn(),
}));

vi.mock("@lib/validationSchemas", () => ({
  validateAccountWithPassword: vi.fn(),
}));

vi.mock("@lib/verify-helper", () => ({
  checkEmailVerification: vi.fn(),
}));

vi.mock("@lib/zitadel", () => ({
  addHumanUser: vi.fn(),
  getLoginSettings: vi.fn(),
  getUserByID: vi.fn(),
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

describe("registerUser", () => {
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

    vi.mocked(getUserByID).mockResolvedValue({
      user: {
        type: {
          case: "human",
          value: {},
        },
      },
    } as never);

    vi.mocked(checkEmailVerification).mockReturnValue(undefined);
    vi.mocked(completeFlowOrGetUrl).mockResolvedValue({
      redirect: "/account?requestId=req-123",
    } as never);
  });

  it("returns generic error when validation fails", async () => {
    vi.mocked(validateAccountWithPassword).mockResolvedValue({ success: false } as never);

    const response = await registerUser(baseCommand);

    expect(response).toEqual({ error: "translated:errors.couldNotCreateUser" });
    expect(addHumanUser).not.toHaveBeenCalled();
  });

  it("returns generic error when user creation fails", async () => {
    vi.mocked(addHumanUser).mockResolvedValue(undefined as never);

    const response = await registerUser(baseCommand);

    expect(response).toEqual({ error: "translated:errors.couldNotCreateUser" });
  });

  it("returns session error when session cannot be created", async () => {
    vi.mocked(createSessionAndUpdateCookie).mockResolvedValue({} as never);

    const response = await registerUser(baseCommand);

    expect(response).toEqual({ error: "translated:errors.couldNotCreateSession" });
  });

  it("returns not-found error when created user cannot be fetched", async () => {
    vi.mocked(getUserByID).mockResolvedValue({ user: undefined } as never);

    const response = await registerUser(baseCommand);

    expect(response).toEqual({ error: "translated:errors.userNotFound" });
  });

  it("returns email verification redirect when required", async () => {
    vi.mocked(checkEmailVerification).mockReturnValue({
      redirect: "/verify?requestId=req-123",
    });

    const response = await registerUser(baseCommand);

    expect(response).toEqual({ redirect: "/verify?requestId=req-123" });
    expect(completeFlowOrGetUrl).not.toHaveBeenCalled();
  });

  it("completes flow with session when requestId exists", async () => {
    const response = await registerUser(baseCommand);

    expect(response).toEqual({ redirect: "/account?requestId=req-123" });
    expect(completeFlowOrGetUrl).toHaveBeenCalledWith(
      {
        sessionId: "session-123",
        requestId: "req-123",
      },
      "https://forms.example"
    );
  });

  it("completes flow with loginName when requestId is missing", async () => {
    const response = await registerUser({
      ...baseCommand,
      requestId: undefined,
    });

    expect(response).toEqual({ redirect: "/account?requestId=req-123" });
    expect(completeFlowOrGetUrl).toHaveBeenCalledWith(
      {
        loginName: "person@canada.ca",
      },
      "https://forms.example"
    );
  });
});
