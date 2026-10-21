"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import Link from "next/link";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getImageUrl } from "@lib/utils/imageUrl";
import { I18n, useTranslation } from "@i18n";
import { Image } from "@components/ui/image/Image";

export function GenericError({
  title = "title",
  // Set as a falsy value to hide
  instructions = "instructions",
  aboutLink,
}: {
  aboutLink?: string | false;
  title?: string;
  instructions?: string;
}) {
  const { t } = useTranslation("error");

  return (
    <div className="mx-auto flex flex-col items-center px-4">
      <title>{t(title)}</title>
      <h1 id="page-heading" className="mb-0 flex items-start justify-center gap-3 text-center">
        <Image
          src={getImageUrl("/img/lines-circle-left.svg")}
          alt=""
          width={31}
          height={39}
          className="sm:hidden"
        />
        <I18n i18nKey={title} namespace="error" />
        <Image
          src={getImageUrl("/img/lines-circle-right.svg")}
          alt=""
          width={31}
          height={39}
          className="sm:hidden"
        />
      </h1>
      {instructions && (
        <p className="mt-3">
          <I18n i18nKey={instructions} namespace="error" />
        </p>
      )}
      <div className="mt-3 mb-6 flex flex-wrap justify-center gap-4">
        {aboutLink && (
          <a href={aboutLink}>
            <I18n i18nKey="about" namespace="error" />
          </a>
        )}
        <Link href="/contact-us">
          <I18n i18nKey="contact" namespace="error" />
        </Link>
      </div>
      <Image
        src={getImageUrl("/img/birds-puzzle-pieces.webp")}
        alt=""
        width={586}
        height={441}
        preload={true}
        className="h-auto w-full max-w-172 translate-x-12 sm:hidden"
      />
    </div>
  );
}
