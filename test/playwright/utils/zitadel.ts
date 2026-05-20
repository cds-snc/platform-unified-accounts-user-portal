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

let userService: Client<typeof UserService>;

type AnyFn = (req: UnaryRequest | StreamRequest) => Promise<UnaryResponse | StreamResponse>;

const addRequestHeaders = () => (next: AnyFn) => async (req: UnaryRequest | StreamRequest) => {
  req.header.set("waf-geo-restriction-bypass", process.env.WAF_GEO_RESTRICTION_BYPASS ?? "");
  return next(req);
};

function getUserService(bearerToken: string, apiBaseUrl: string): Client<typeof UserService> {
  if (userService) {
    return userService;
  }

  const transport = createServerTransport(bearerToken, {
    baseUrl: apiBaseUrl,
    interceptors: [addRequestHeaders()],
  });

  userService = createClientFor(UserService)(transport);

  return userService;
}

export async function getUserIdByEmail(
  email: string,
  bearerToken: string,
  apiBaseUrl: string
): Promise<string> {
  const response = await getUserService(bearerToken, apiBaseUrl).listUsers({
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
  bearerToken: string,
  apiBaseUrl: string
): Promise<string> {
  const response = await getUserService(bearerToken, apiBaseUrl).sendEmailCode(
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

export async function deleteUserById(userId: string, bearerToken: string, apiBaseUrl: string) {
  return getUserService(bearerToken, apiBaseUrl).deleteUser(
    create(DeleteUserRequestSchema, {
      userId,
    })
  );
}
