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

  if (process.env.OPEN_REGISTRATION === "true") {
    return (
      <AuthPanel titleI18nKey="title" descriptionI18nKey="description" namespace="register">
        <RegisterForm requestId={requestId} />
      </AuthPanel>
    );
  }

  if (!invite) {
    return (
      <AuthPanel
        titleI18nKey="closed.title"
        descriptionI18nKey="closed.description"
        namespace="register"
      />
    );
  }

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
