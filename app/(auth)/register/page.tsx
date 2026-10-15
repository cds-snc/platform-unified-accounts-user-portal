/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { SearchParams } from "@lib/utils";
import { validateInvite } from "@lib/validation/validationSchemas";
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

  // check if invite passes validation

  const validationResult = await validateInvite(invite ?? "");
  if (!validationResult.success) {
    return (
      <AuthPanel
        titleI18nKey="closed.title"
        descriptionI18nKey="closed.description"
        namespace="register"
        dataTestId="registration-closed"
      />
    );
  }

  const { inviteEmail, inviteCode } = validationResult.output;

  if (!inviteEmail || !isValidGovEmail(inviteEmail) || !inviteCode) {
    return <ErrorComponent error={{ name: "Service Error", message: "No Invite Found" }} />;
  }

  return (
    <AuthPanel titleI18nKey="title" descriptionI18nKey="description" namespace="register">
      <RegisterForm requestId={requestId} email={inviteEmail} inviteCode={inviteCode} />
    </AuthPanel>
  );
}
