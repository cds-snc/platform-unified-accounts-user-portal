const nextPublicEnableEmailOtp = process.env.NEXT_PUBLIC_ENABLE_EMAIL_OTP;

export const ENABLE_EMAIL_OTP =
  nextPublicEnableEmailOtp === undefined ? false : nextPublicEnableEmailOtp === "true";
export const LOGGED_IN_HOME_PAGE = "/account";
export const ZITADEL_ORGANIZATION = process.env.ZITADEL_ORGANIZATION || "";
