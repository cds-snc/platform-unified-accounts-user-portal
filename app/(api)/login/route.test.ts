import { NextRequest } from "next/server";
import { Prompt } from "@zitadel/proto/zitadel/oidc/v2/authorization_pb";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { constructUrl, getAuthRequest } = vi.hoisted(() => ({
  constructUrl: vi.fn((_: NextRequest, path: string) => new URL(path, "https://portal.test")),
  getAuthRequest: vi.fn(),
}));

vi.mock("@root/constants/config", () => ({
  ZITADEL_ORGANIZATION: "test-organization",
}));

vi.mock("@lib/service-url", () => ({
  constructUrl,
}));

vi.mock("@lib/zitadel", () => ({
  getAuthRequest,
}));

import { GET } from "./route";

describe("GET /login", () => {
  beforeEach(() => {
    getAuthRequest.mockReset();
    constructUrl.mockClear();
  });

  it("rejects RSC requests before looking up the authentication request", async () => {
    const response = await GET(new NextRequest("https://portal.test/login?_rsc=1&requestId=123"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "RSC requests not supported" });
    expect(getAuthRequest).not.toHaveBeenCalled();
  });

  it("rejects requests without authentication request parameters", async () => {
    const response = await GET(new NextRequest("https://portal.test/login"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "No valid authentication request found",
    });
    expect(getAuthRequest).not.toHaveBeenCalled();
  });

  it("redirects registration requests to before-you-start", async () => {
    getAuthRequest.mockResolvedValue({
      authRequest: {
        id: "zitadel-request-456",
        prompt: [Prompt.CREATE],
      },
    });

    const response = await GET(
      new NextRequest("https://portal.test/login?requestId=oidc_request-123")
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://portal.test/before-you-start?requestId=oidc_zitadel-request-456&organization=test-organization"
    );
    expect(getAuthRequest).toHaveBeenCalledWith({ authRequestId: "request-123" });
    expect(constructUrl).toHaveBeenCalledWith(expect.any(NextRequest), "/before-you-start");
  });

  it("redirects non-registration requests to interactive login", async () => {
    getAuthRequest.mockResolvedValue({
      authRequest: {
        id: "zitadel-request-456",
        prompt: [],
      },
    });

    const response = await GET(new NextRequest("https://portal.test/login?requestId=request-123"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://portal.test/?requestId=request-123");
    expect(getAuthRequest).toHaveBeenCalledWith({ authRequestId: "request-123" });
    expect(constructUrl).toHaveBeenCalledWith(expect.any(NextRequest), "/?requestId=request-123");
  });

  it("uses the original request ID when no authentication request is returned", async () => {
    getAuthRequest.mockResolvedValue({ authRequest: undefined });

    const response = await GET(new NextRequest("https://portal.test/login?requestId=request-789"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://portal.test/?requestId=request-789");
    expect(getAuthRequest).toHaveBeenCalledWith({ authRequestId: "request-789" });
  });
});
