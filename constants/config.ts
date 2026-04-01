const ALLOWED_ZITADEL_ORGANIZATIONS: string[] = ["274346650812624491", "357256007820312901"];

const isDev = process.env.NODE_ENV === "development";
const zitadelOrganization = process.env.ZITADEL_ORGANIZATION ?? "";
if (!isDev && !ALLOWED_ZITADEL_ORGANIZATIONS.includes(zitadelOrganization)) {
  throw new Error(`Invalid ZITADEL_ORGANIZATION: "${zitadelOrganization}"`);
}

export const ENABLE_EMAIL_OTP = false;
export const LOGGED_IN_HOME_PAGE = "/account";
export const ZITADEL_ORGANIZATION = zitadelOrganization;
