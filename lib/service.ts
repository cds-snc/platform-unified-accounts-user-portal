/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { createClientFor } from "@zitadel/client";
import { IdentityProviderService } from "@zitadel/proto/zitadel/idp/v2/idp_service_pb";
import { OIDCService } from "@zitadel/proto/zitadel/oidc/v2/oidc_service_pb";
import { OrganizationService } from "@zitadel/proto/zitadel/org/v2/org_service_pb";
import { SessionService } from "@zitadel/proto/zitadel/session/v2/session_service_pb";
import { SettingsService } from "@zitadel/proto/zitadel/settings/v2/settings_service_pb";
import { UserService } from "@zitadel/proto/zitadel/user/v2/user_service_pb";

/*--------------------------------------------*
 * Parent Relative
 *--------------------------------------------*/
import { createServerTransport } from "../lib/zitadel";
type ServiceClass =
  | typeof IdentityProviderService
  | typeof UserService
  | typeof OrganizationService
  | typeof SessionService
  | typeof OIDCService
  | typeof SettingsService;

export async function createServiceForHost<T extends ServiceClass>(service: T, serviceUrl: string) {
  // if we are running in a multitenancy context, use the system user token

  const token = process.env.ZITADEL_SERVICE_USER_TOKEN;

  if (!serviceUrl) {
    throw new Error("No instance url found");
  }

  if (!token) {
    throw new Error("No token found");
  }

  const transport = createServerTransport(token, serviceUrl);

  return createClientFor<T>(service)(transport);
}
