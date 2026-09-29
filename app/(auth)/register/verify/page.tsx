/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { AuthLevel, checkAuthenticationLevel } from "@lib/server/route-protection";
import { SearchParams } from "@lib/utils";
import { UserAvatar } from "@components/account/user-avatar";
import { AuthPanel } from "@components/auth/AuthPanel";

/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/
import { VerifyEmailForm } from "./components/VerifyEmailForm";
import { sendVerificationEmail } from "./action";

export default async function Page(props: { searchParams: Promise<SearchParams> }) {
  const searchParams = await props.searchParams;

  const { requestId } = searchParams;

  // TODO: Do we want to allow a user to verify their email in a different browser where they didn't
  // start their session.

  const session = await checkAuthenticationLevel(AuthLevel.PASSWORD_REQUIRED, requestId, {
    requireEmailVerified: false,
  });

  if (!session.factors?.user?.id) {
    throw new Error("Used as a type guard to ensure user has id property");
  }
  // Send the email while the page renders and loads
  await sendVerificationEmail();

  return (
    <AuthPanel titleI18nKey="title" descriptionI18nKey="description" namespace="verify">
      <VerifyEmailForm
        loginName={session.factors?.user?.loginName}
        userId={session.factors.user.id}
        requestId={requestId}
      >
        <div className="my-8">
          <UserAvatar
            loginName={session.factors?.user?.loginName}
            displayName={session.factors?.user?.displayName}
            showDropdown={false}
          ></UserAvatar>
        </div>
      </VerifyEmailForm>
    </AuthPanel>
  );
}
