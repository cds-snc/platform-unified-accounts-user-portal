/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/

import { AuthLevel, checkAuthenticationLevel } from "@lib/server/route-protection";
import { SearchParams } from "@lib/utils";
/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getImageUrl } from "@lib/utils/imageUrl";
import { UserAvatar } from "@components/account/user-avatar/UserAvatar";
import { AuthPanel } from "@components/auth/AuthPanel";
import { Image } from "@components/ui/image/Image";

import { ContentHolder } from "./components/ContentHolder";
import { NextReditect } from "./components/NextRedirect";

export default async function Page(props: { searchParams: Promise<SearchParams> }) {
  const searchParams = await props.searchParams;
  const { requestId } = searchParams;
  const session = await checkAuthenticationLevel(AuthLevel.PASSWORD_REQUIRED, requestId);

  const loginName = session.factors?.user?.loginName;

  return (
    <div data-wide-panel="true">
      <AuthPanel
        titleI18nKey="none"
        pageTitleI18nKey="title"
        descriptionI18nKey="none"
        namespace="allSet"
        wide={true}
        requestId={requestId}
        variant="wide"
      >
        <div className="grid grid-cols-1 gap-8 tablet:grid-cols-2">
          {/* Left column: Goose image */}
          <div className="flex items-center justify-center">
            <Image
              src={getImageUrl("/img/goose_all_set.png")}
              alt="All set"
              data-testid="all-set"
              width={352}
              height={261}
              className="h-auto w-full max-w-62.5"
            />
          </div>

          {/* Right column: Title, user info, and button */}
          <div className="flex flex-col justify-center">
            <ContentHolder />

            {/* User email display */}
            {loginName && (
              <div className="mb-8">
                <UserAvatar loginName={loginName} showDropdown={false} />
              </div>
            )}

            {/* Continue button */}
            <NextReditect />
          </div>
        </div>
      </AuthPanel>
    </div>
  );
}
