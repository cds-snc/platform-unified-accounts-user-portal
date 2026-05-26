/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { Metadata } from "next";
import { redirect } from "next/navigation";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { logMessage } from "@lib/logger";
import { AuthLevel, checkAuthenticationLevel } from "@lib/server/route-protection";
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

  const session = await checkAuthenticationLevel(AuthLevel.ANY_MFA_REQUIRED, requestId).then(
    (result) => {
      if (result.session === null) {
        throw new Error(
          "This should never throw but used as a type check in checkAuthenticationLevel"
        );
      }
      return result.session;
    }
  );

  const userId = session.factors?.user?.id;
  const userResponse = await getUserByID(userId!);
  const user = userResponse.user?.type.case === "human" ? userResponse.user?.type.value : undefined;
  const firstName = user?.profile?.givenName;
  const lastName = user?.profile?.familyName;
  const email = user?.email?.email;
  const hasRequiredProfile = !!firstName && !!lastName && !!email;

  if (!hasRequiredProfile || !userId) {
    logMessage.info("Missing required user information, redirecting to login");
    redirect(loginRedirect);
  }

  const [u2fList, authenticatorStatus] = await Promise.all([
    getU2FList({
      userId: userId!,
    }),
    getTOTPStatus({
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
