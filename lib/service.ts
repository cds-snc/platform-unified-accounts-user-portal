/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { type Client, createClientFor } from "@zitadel/client";
import { AppService } from "@zitadel/proto/zitadel/app/v2beta/app_service_pb";
import { IdentityProviderService } from "@zitadel/proto/zitadel/idp/v2/idp_service_pb";
import { OIDCService } from "@zitadel/proto/zitadel/oidc/v2/oidc_service_pb";
import { OrganizationService } from "@zitadel/proto/zitadel/org/v2/org_service_pb";
import { ProjectService } from "@zitadel/proto/zitadel/project/v2beta/project_service_pb";
import { SessionService } from "@zitadel/proto/zitadel/session/v2/session_service_pb";
import { SettingsService } from "@zitadel/proto/zitadel/settings/v2/settings_service_pb";
import { UserService } from "@zitadel/proto/zitadel/user/v2/user_service_pb";

/*--------------------------------------------*
 * Parent Relative
 *--------------------------------------------*/
import { createServerTransport } from "../lib/zitadel";

import { logMessage } from "./logger";
import { getServiceUrlFromHeaders } from "./service-url";

const ServiceClass = {
  IdentityProviderService,
  UserService,
  OrganizationService,
  SessionService,
  OIDCService,
  SettingsService,
  AppService,
  ProjectService,
} as const;

type Services = (typeof ServiceClass)[keyof typeof ServiceClass];

if (!process.env.ZITADEL_SERVICE_USER_TOKEN) {
  logMessage.error("No Zitadel Service Token found");
}

const services: Record<string, Client<Services>> = {};
const token: string = process.env.ZITADEL_SERVICE_USER_TOKEN ?? "dummy_token_for_building";

export const getServiceForHost = async <S extends keyof typeof ServiceClass>(service: S) => {
  if (!services[service]) {
    const { serviceUrl } = await getServiceUrlFromHeaders();
    const transport = createServerTransport(token, serviceUrl);
    services[service] = createClientFor(ServiceClass[service])(transport);
  }
  return services[service] as Client<(typeof ServiceClass)[S]>;
};
