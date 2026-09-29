/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/

import { redirect } from "next/navigation";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { logMessage } from "@lib/logger";
import { AuthLevel, checkAuthenticationLevel } from "@lib/server/route-protection";
import { buildUrlWithRequestId, SearchParams } from "@lib/utils";
import { getU2FList, getUserByID } from "@lib/zitadel";
import { PageTitle } from "@components/ui/title/PageTitle";

/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/
import { MFAAuthentication } from "./components/MFAAuthentication";
import { PasswordAuthentication } from "./components/PasswordAuthentication";
import { PersonalDetails } from "./components/PersonalDetails";

export default async function Page(props: { searchParams: Promise<SearchParams> }) {
  const searchParams = await props.searchParams;
  const requestId = searchParams.requestId;
  const loginRedirect = buildUrlWithRequestId("/", requestId);

  const session = await checkAuthenticationLevel(AuthLevel.MFA_REQUIRED, requestId);

  const userId = session.factors.user.id;
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

  const u2fList = await getU2FList({
    userId: userId!,
  });

  return (
    <>
      <PageTitle i18nKey="navigation.title" namespace="account" />
      <PersonalDetails firstName={firstName} lastName={lastName} email={email} className="mb-4" />
      <div className="rounded-2xl border-2 border-gray-300 bg-white p-6">
        <PasswordAuthentication className="mb-4" />
        <MFAAuthentication
          u2fList={u2fList}
          authenticatorStatus={session.authMethods.includes(4)}
        />
      </div>
    </>
  );
}
