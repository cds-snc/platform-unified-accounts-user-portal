import type {
  StreamRequest,
  StreamResponse,
  UnaryRequest,
  UnaryResponse,
} from "@connectrpc/connect";
import { type Client, create, createClientFor } from "@zitadel/client";
import { createServerTransport } from "@zitadel/client/node";
import { TextQueryMethod } from "@zitadel/proto/zitadel/object/v2/object_pb.js";
import { ReturnEmailVerificationCodeSchema } from "@zitadel/proto/zitadel/user/v2/email_pb.js";
import { SearchQuerySchema } from "@zitadel/proto/zitadel/user/v2/query_pb.js";
import {
  DeleteUserRequestSchema,
  SendEmailCodeRequestSchema,
  UserService,
} from "@zitadel/proto/zitadel/user/v2/user_service_pb.js";
import { createSign } from "crypto";

let userService: Client<typeof UserService>;

type AnyFn = (req: UnaryRequest | StreamRequest) => Promise<UnaryResponse | StreamResponse>;

const addRequestHeaders = () => (next: AnyFn) => async (req: UnaryRequest | StreamRequest) => {
  req.header.set("waf-geo-restriction-bypass", process.env.WAF_GEO_RESTRICTION_BYPASS ?? "");
  return next(req);
};

function getUserService(accessToken: string, apiBaseUrl: string): Client<typeof UserService> {
  if (userService) {
    return userService;
  }

  const transport = createServerTransport(accessToken, {
    baseUrl: apiBaseUrl,
    interceptors: [addRequestHeaders()],
  });

  userService = createClientFor(UserService)(transport);

  return userService;
}

export async function getZitadelAccessToken(
  serviceAccountKey: string,
  apiBaseUrl: string
): Promise<string> {
  const { userId, keyId, key } = JSON.parse(serviceAccountKey) as {
    userId: string;
    keyId: string;
    key: string;
  };

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", kid: keyId })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({ iss: userId, sub: userId, aud: apiBaseUrl, iat: now, exp: now + 300 })
  ).toString("base64url");
  const signingInput = `${header}.${payload}`;
  const signature = createSign("RSA-SHA256").update(signingInput).sign(key, "base64url");
  const jwt = `${signingInput}.${signature}`;

  const response = await fetch(`${apiBaseUrl}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
      scope: "openid urn:zitadel:iam:org:project:id:zitadel:aud",
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to exchange JWT for access token: ${response.status} ${await response.text()}`
    );
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

export async function getUserIdByEmail(
  email: string,
  accessToken: string,
  apiBaseUrl: string
): Promise<string> {
  const response = await getUserService(accessToken, apiBaseUrl).listUsers({
    queries: [
      create(SearchQuerySchema, {
        query: {
          case: "emailQuery",
          value: {
            emailAddress: email,
            method: TextQueryMethod.EQUALS,
          },
        },
      }),
    ],
  });
  const userId = response.result?.[0]?.userId;

  if (!userId) {
    throw new Error(`Unable to find userId for email ${email}`);
  }

  return userId;
}

export async function getEmailVerificationCode(
  userId: string,
  accessToken: string,
  apiBaseUrl: string
): Promise<string> {
  const response = await getUserService(accessToken, apiBaseUrl).sendEmailCode(
    create(SendEmailCodeRequestSchema, {
      userId,
      verification: {
        case: "returnCode",
        value: create(ReturnEmailVerificationCodeSchema, {}),
      },
    })
  );
  const verificationCode = response.verificationCode;

  if (!verificationCode) {
    throw new Error(`Unable to fetch verification code for user ${userId}`);
  }

  return verificationCode;
}

export async function deleteUserById(userId: string, accessToken: string, apiBaseUrl: string) {
  return getUserService(accessToken, apiBaseUrl).deleteUser(
    create(DeleteUserRequestSchema, {
      userId,
    })
  );
}
