"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { useEffect } from "react";
import Link from "next/link";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getImageUrl } from "@lib/utils/imageUrl";
import { I18n, useTranslation } from "@i18n";
import { useSiteConfig } from "@components/contexts/SiteConfigContext";
import { Image } from "@components/ui/image/Image";

export default function Error({ error }: { error: Error & { digest?: string } }) {
  const { t } = useTranslation("error");
  const { getSiteLink } = useSiteConfig();
  const aboutLink = getSiteLink("about");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex flex-col items-center px-4 pt-24">
      <title>{t("title")}</title>
      <h1 className="flex items-start justify-center gap-3 text-center">
        <Image
          src={getImageUrl("/img/lines-circle-left.svg")}
          alt=""
          width={31}
          height={39}
          className="sm:hidden"
        />
        <I18n i18nKey="title" namespace="error" />
        <Image
          src={getImageUrl("/img/lines-circle-right.svg")}
          alt=""
          width={31}
          height={39}
          className="sm:hidden"
        />
      </h1>
      <p>
        <I18n i18nKey="instructions" namespace="error" />
      </p>
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
        src={getImageUrl("/img/birds-puzzle-pieces.png")}
        alt=""
        width={586}
        height={441}
        preload={true}
        className="h-auto w-full max-w-172 translate-x-12 sm:hidden"
      />
    </main>
  );
}
