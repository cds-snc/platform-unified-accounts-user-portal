/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getAllSessions } from "@lib/cookies";
import { buildUrlWithRequestId, SearchParams } from "@lib/utils";
import { AuthPanel } from "@components/auth/AuthPanel";

/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/
import { SignIn } from "./components/SignIn";

export default async function LoginPage(props: { searchParams: Promise<SearchParams> }) {
  const searchParams = await props.searchParams;
  const requestId = searchParams.requestId;

  const allPreviousSessions = await getAllSessions(false).then(
    async (sessions) => new Map(sessions.map((session) => [session.id, session]))
  );

  const registerLink = buildUrlWithRequestId("/register", requestId);

  return (
    <AuthPanel titleI18nKey="title" descriptionI18nKey="none" namespace="start">
      <SignIn requestId={requestId} registerLink={registerLink} allSessions={allPreviousSessions} />
    </AuthPanel>
  );
}
