/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getSessionCredentials } from "@lib/cookies";
import { logMessage } from "@lib/logger";
import { AuthLevel, checkAuthenticationLevel } from "@lib/server/route-protection";
import { getServiceUrlFromHeaders } from "@lib/service-url";
import { isSessionValid, loadMostRecentSession, loadSessionById } from "@lib/session";
import { buildUrlWithRequestId, SearchParams } from "@lib/utils";
import { getTOTPStatus, getU2FList, getUserByID } from "@lib/zitadel";
import { serverTranslation } from "@i18n/server";

/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/
import { MFAAuthentication } from "./components/MFAAuthentication";
import { PasswordAuthentication } from "./components/PasswordAuthentication";
import { PersonalDetails } from "./components/PersonalDetails";
import { VerifiedAccount } from "./components/VerifiedAccount";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await serverTranslation("account");
  return { title: t("navigation.title") };
}

export default async function Page(props: { searchParams: Promise<SearchParams> }) {
  const searchParams = await props.searchParams;
  const requestId = searchParams.requestId;
  const loginRedirect = buildUrlWithRequestId("/", requestId);

  const _headers = await headers();
  const { serviceUrl } = getServiceUrlFromHeaders(_headers);

  // Attempt to get session credentials from cookies
  let sessionId, organization, loginName;
  try {
    ({ sessionId, organization, loginName } = await getSessionCredentials());
  } catch (error) {
    redirect(loginRedirect);
  }

  // Page-level authentication check - defense in depth
  const authCheck = await checkAuthenticationLevel(
    serviceUrl,
    AuthLevel.ANY_MFA_REQUIRED,
    loginName,
    organization
  );

  if (!authCheck.satisfied) {
    redirect(buildUrlWithRequestId(authCheck.redirect || "/", requestId));
  }

  const session = await loadSessionById(serviceUrl, sessionId, organization);
  const userId = session.factors?.user?.id;
  const userResponse = await getUserByID({ serviceUrl, userId: userId! });
  const user = userResponse.user?.type.case === "human" ? userResponse.user?.type.value : undefined;
  const firstName = user?.profile?.givenName;
  const lastName = user?.profile?.familyName;
  const email = user?.email?.email;
  const hasRequiredProfile = !!firstName && !!lastName && !!email;

  if (!hasRequiredProfile || !userId) {
    logMessage.info("Missing required user information, redirecting to login");
    redirect(loginRedirect);
  }

  try {
    const authSession = await loadMostRecentSession({
      serviceUrl,
      sessionParams: { loginName, organization },
    });

    if (!authSession || !(await isSessionValid({ serviceUrl, session: authSession }))) {
      redirect(loginRedirect);
    }
  } catch (error) {
    logMessage.error(
      `Error validating session, redirecting to login. Errors: ${JSON.stringify(error)}`
    );
    redirect(loginRedirect);
  }

  const [u2fList, authenticatorStatus] = await Promise.all([
    getU2FList({
      serviceUrl,
      userId: userId!,
    }),
    getTOTPStatus({
      serviceUrl,
      userId: userId!,
    }),
  ]);

  return (
    <>
      <PersonalDetails userId={userId} firstName={firstName} lastName={lastName} className="mb-4" />
      <VerifiedAccount email={email} className="mb-4" />
      <PasswordAuthentication className="mb-4" />
      <MFAAuthentication
        u2fList={u2fList}
        authenticatorStatus={authenticatorStatus}
        userId={userId}
      />
    </>
  );
}
