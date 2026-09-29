/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getImageUrl } from "@lib/utils/imageUrl";
import { I18n } from "@i18n";
import { Image } from "@components/ui/image/Image";
import { PageTitle } from "@components/ui/title/PageTitle";

export default async function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <PageTitle i18nKey="title" namespace="404" />
      <div className="text-center">
        <h1 className="mt-8 mb-6!">
          <I18n i18nKey="title" namespace="404" />
        </h1>
        <Image
          src={getImageUrl("/img/goose.png")}
          alt="Goose"
          width={200}
          height={200}
          className="mx-auto mb-6 h-auto"
          preload={true}
        />
        <p>
          <I18n i18nKey="body" namespace="404" />
        </p>
      </div>
    </div>
  );
}
