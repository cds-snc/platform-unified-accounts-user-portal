/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { SearchParams } from "@lib/utils";
import { isValidGovEmail } from "@lib/validation/validators";
import { AuthPanel } from "@components/auth/AuthPanel";

import ErrorComponent from "../error";

/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/
import { RegisterForm } from "./components/RegisterForm";

export default async function Page(props: { searchParams: Promise<SearchParams> }) {
  const searchParams = await props.searchParams;
  const { requestId, invite } = searchParams;

  if (invite) {
    const { inviteEmail, inviteCode } = JSON.parse(Buffer.from(invite, "base64").toString("utf8"));

    if (!inviteEmail || !isValidGovEmail(inviteEmail) || !inviteCode) {
      return <ErrorComponent error={{ name: "Service Error", message: "No Invite Found" }} />;
    }

    return (
      <AuthPanel titleI18nKey="title" descriptionI18nKey="description" namespace="register">
        <RegisterForm requestId={requestId} email={inviteEmail} inviteCode={inviteCode} />
      </AuthPanel>
    );
  }

  return (
    <AuthPanel
      titleI18nKey="closed.title"
      descriptionI18nKey="closed.description"
      namespace="register"
    />
  );

  // Only uncomment the below once registration is open to all
  // At that point this page can be refactored to better handle boths paths
  /***********************************************************
  return (
    <AuthPanel titleI18nKey="title" descriptionI18nKey="description" namespace="register">
      <RegisterForm requestId={requestId} />
    </AuthPanel>
  );
  *************************************************************/
}
