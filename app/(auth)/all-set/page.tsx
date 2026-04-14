/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { Metadata } from "next";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getSessionCredentials } from "@lib/cookies";
import { getImageUrl } from "@lib/imageUrl";
import { buildUrlWithRequestId, SearchParams } from "@lib/utils";
import { I18n } from "@i18n";
import { serverTranslation } from "@i18n/server";
import { UserAvatar } from "@components/account/user-avatar/UserAvatar";
import { AuthPanel } from "@components/auth/AuthPanel";
import { CircleCheckIcon } from "@components/icons/CircleCheckIcon";
import { LinkButton } from "@components/ui/button/LinkButton";
import { Image } from "@components/ui/image/Image";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await serverTranslation("allSet");
  return { title: t("title") };
}

export default async function Page(props: { searchParams: Promise<SearchParams> }) {
  const searchParams = await props.searchParams;
  const { requestId, checkAfter, method } = searchParams;
  const { loginName } = await getSessionCredentials();

  let continueUrl = buildUrlWithRequestId("/account", requestId);

  if (checkAfter === "true") {
    if (method === "time-based") {
      continueUrl = buildUrlWithRequestId("/otp/time-based", requestId);
    } else if (method === "u2f") {
      continueUrl = buildUrlWithRequestId("/u2f", requestId);
    }
  } else if (requestId && (requestId.startsWith("oidc_") || requestId.startsWith("saml_"))) {
    // Defer callback completion to click-time to avoid consuming one-time state during SSR.
    continueUrl = buildUrlWithRequestId("/login", requestId);
  }

  return (
    <div data-wide-panel="true">
      <AuthPanel titleI18nKey="none" descriptionI18nKey="none" namespace="allSet" wide={true}>
        <div className="grid grid-cols-1 gap-8 tablet:grid-cols-2">
          {/* Left column: Goose image */}
          <div className="flex items-center justify-center">
            <Image
              src={getImageUrl("/img/goose_all_set.png")}
              alt="All set"
              width={352}
              height={261}
              className="h-auto w-full max-w-[250px]"
            />
          </div>

          {/* Right column: Title, user info, and button */}
          <div className="flex flex-col justify-center">
            {/* Title with checkmark icon */}
            <div className="mb-8 flex items-center gap-3">
              <h1 className="!mb-0 text-4xl font-bold">
                <I18n i18nKey="title" namespace="allSet" />
              </h1>
              <CircleCheckIcon className="size-10 text-gcds-green-700" />
            </div>

            {/* Description */}
            <p className="mb-8">
              <I18n i18nKey="description" namespace="allSet" />
            </p>

            {/* User email display */}
            {loginName && (
              <div className="mb-8">
                <UserAvatar loginName={loginName} showDropdown={false} />
              </div>
            )}

            {/* Continue button */}
            <div>
              <LinkButton.Primary href={continueUrl}>
                <I18n i18nKey="continueButton" namespace="allSet" />
              </LinkButton.Primary>
            </div>
          </div>
        </div>
      </AuthPanel>
    </div>
  );
}
