/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import Image from "next/image";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getImageUrl } from "@lib/imageUrl";
import { buildUrlWithRequestId, SearchParams } from "@lib/utils";
import { I18n } from "@i18n";
import { AuthPanel } from "@components/auth/AuthPanel";
import { LinkButton } from "@components/ui/button/LinkButton";
export default async function Page(props: { searchParams: Promise<SearchParams> }) {
  const searchParams = await props.searchParams;

  const { requestId } = searchParams;

  return (
    <AuthPanel
      titleI18nKey="successTitle"
      descriptionI18nKey="successDescription"
      namespace="verify"
    >
      <div className="mt-6">
        <Image
          src={getImageUrl("/img/goose_flying.png")}
          alt="Success"
          width={704 / 2}
          height={522 / 2}
          className="mx-auto mb-4"
          style={{ color: "" }}
        />

        <LinkButton.Primary href={buildUrlWithRequestId("/mfa/set", requestId)} className="mt-10">
          <I18n i18nKey="continueButton" namespace="verify" />
        </LinkButton.Primary>
      </div>
    </AuthPanel>
  );
}
