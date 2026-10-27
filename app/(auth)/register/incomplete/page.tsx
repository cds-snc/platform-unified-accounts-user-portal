/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { NextSteps } from "@root/app/(auth)/register/incomplete/components/NextSteps";
import { AuthLevel, checkAuthenticationLevel } from "@lib/server/route-protection";
import { SearchParams } from "@lib/utils";

/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/

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

  return (
    <NextSteps
      titleI18nKey="incomplete.title"
      namespace="register"
      imageSrc="/img/cardinal.png"
      variant="narrow"
      listI18nKeys={[{ key: "incomplete.item1", checked: true }, { key: "incomplete.item2" }]}
      hintI18nKey="incomplete.hint"
      action="sendCode"
      requestId={requestId}
    ></NextSteps>
  );
}
