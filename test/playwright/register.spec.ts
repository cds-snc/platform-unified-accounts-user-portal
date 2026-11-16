import { test } from "./utils/fixtures";
import { registerUser } from "./utils/register";
import { MfaType, RegistrationType } from "./utils/register";
import { getRequiredEnv } from "./utils/utils";
import { getZitadelAccessToken } from "./utils/zitadel";

test.describe("register user flow", () => {
  let idpUrl: string;
  let portalUrl: string;
  let serviceAccountKey: string;
  let registerEmail: string;
  let accessToken: string;
  let zitadelOrgId: string;

  test.beforeAll(async () => {
    idpUrl = getRequiredEnv("IDP_URL");
    portalUrl = getRequiredEnv("PORTAL_URL");
    serviceAccountKey = getRequiredEnv("ZITADEL_SERVICE_ACCOUNT_KEY");
    accessToken = await getZitadelAccessToken(serviceAccountKey, idpUrl);
    registerEmail = getRequiredEnv("REGISTER_EMAIL");
    zitadelOrgId = getRequiredEnv("ZITADEL_ORGANIZATION_ID");
  });

  test("creates a new user with TOTP MFA", async ({ page, trackUserForCleanup }) => {
    await registerUser(page, {
      portalUrl,
      idpUrl,
      accessToken,
      registerEmail,
      zitadelOrgId,
      mfaType: MfaType.TOTP,
      registrationFlow: RegistrationType.INVITE,
      trackUserForCleanup,
    });
  });

  test("creates a new user with U2F MFA", async ({ page, trackUserForCleanup }) => {
    await registerUser(page, {
      portalUrl,
      idpUrl,
      accessToken,
      registerEmail,
      zitadelOrgId,
      mfaType: MfaType.U2F,
      registrationFlow: RegistrationType.INVITE,
      trackUserForCleanup,
    });
  });
});
