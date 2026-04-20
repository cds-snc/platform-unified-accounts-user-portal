"use server";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { headers } from "next/headers";
import { GCNotifyConnector } from "@gcforms/connectors";
import { create, Duration } from "@zitadel/client";
import { RequestChallengesSchema } from "@zitadel/proto/zitadel/session/v2/challenge_pb";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getSecurityCodeTemplate } from "@lib/emailTemplates";
import { setSessionAndUpdateCookie } from "@lib/server/cookie";
import { getServiceUrlFromHeaders } from "@lib/service-url";
import { getLoginSettings } from "@lib/zitadel";
import { serverTranslation } from "@i18n/server";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import {
  getMostRecentSessionCookie,
  getSessionCookieById,
  getSessionCookieByLoginName,
} from "../cookies";
import { logMessage } from "../logger";

type SendOtpEmailCommand = {
  loginName?: string;
  sessionId?: string;
  organization?: string;
  requestId?: string;
};

/**
 * Send OTP email using GC Notify instead of Zitadel's built-in email
 * Uses the returnCode challenge to get the OTP code from Zitadel,
 * then sends it via GC Notify
 */
export async function sendOtpEmail(command: SendOtpEmailCommand) {
  const { t } = await serverTranslation("otp");
  const { loginName, sessionId, organization, requestId } = command;

  // Get session cookie
  const recentSession = sessionId
    ? await getSessionCookieById({ sessionId })
    : loginName
      ? await getSessionCookieByLoginName({ loginName, organization })
      : await getMostRecentSessionCookie();

  if (!recentSession) {
    return { error: t("errors.couldNotFindSession") };
  }

  const _headers = await headers();
  const { serviceUrl } = getServiceUrlFromHeaders(_headers);

  // Get login settings for lifetime
  const loginSettings = await getLoginSettings({
    serviceUrl,
    organization,
  });

  const lifetime = loginSettings?.secondFactorCheckLifetime ?? {
    seconds: BigInt(60 * 60 * 24), // default to 24 hours
    nanos: 0,
  };

  // Create OTP email challenge with returnCode (returns code instead of sending email)
  const challenges = create(RequestChallengesSchema, {
    otpEmail: {
      deliveryType: {
        case: "returnCode",
        value: {},
      },
    },
  });

  // Call setSession with returnCode challenge
  const session = await setSessionAndUpdateCookie({
    recentCookie: recentSession,
    challenges,
    requestId,
    lifetime: lifetime as Duration,
  }).catch((error) => {
    logMessage.error("Could not set session for OTP challenge", error);
    return null;
  });

  if (!session) {
    return { error: t("errors.couldNotRequestOtp") };
  }

  // Get the OTP code from the challenges response
  const otpCode = session.challenges?.otpEmail;

  if (!otpCode) {
    logMessage.error("No OTP code returned from Zitadel");
    return { error: t("errors.couldNotGenerateOtp") };
  }

  // Get user email from session factors
  // The session should have the user's login name which is typically their email
  const userEmail = session.factors?.user?.loginName;

  if (!userEmail) {
    return { error: t("errors.couldNotGetUserEmail") };
  }

  // Send email via GC Notify
  const apiKey = process.env.NOTIFY_API_KEY;
  const templateId = process.env.TEMPLATE_ID;

  if (!apiKey || !templateId) {
    logMessage.error("Missing NOTIFY_API_KEY or TEMPLATE_ID environment variables");
    return { error: t("errors.emailConfigurationError") };
  }

  try {
    const gcNotify = GCNotifyConnector.default(apiKey);
    await gcNotify.sendEmail(userEmail, templateId, getSecurityCodeTemplate(otpCode));

    logMessage.info("OTP email sent successfully");
    return {
      success: true,
      sessionId: session.id,
      factors: session.factors,
    };
  } catch (error) {
    logMessage.error("Failed to send OTP email via GC Notify", error);
    return { error: t("errors.emailSendFailed") };
  }
}
