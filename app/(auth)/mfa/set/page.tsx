/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { AuthLevel, checkAuthenticationLevel } from "@lib/server/route-protection";
import { SearchParams } from "@lib/utils";
import { AuthPanel } from "@components/auth/AuthPanel";

/*--------------------------------------------*
 * Parent Relative
 *--------------------------------------------*/
import { ChooseSecondFactorToSetup } from "../../u2f/set/components/ChooseSecondFactorToSetup";

export default async function Page(props: { searchParams: Promise<SearchParams> }) {
  const searchParams = await props.searchParams;
  const { requestId } = searchParams;
  await checkAuthenticationLevel(AuthLevel.MFA_CHANGE_REQUIRED, requestId);

  return (
    <AuthPanel titleI18nKey="set.title" descriptionI18nKey="set.description" namespace="mfa">
      <div className="w-full">
        <div className="flex flex-col space-y-4">
          <ChooseSecondFactorToSetup checkAfter={true} requestId={requestId} />
        </div>
      </div>
    </AuthPanel>
  );
}
