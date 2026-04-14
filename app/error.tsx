"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { useEffect } from "react";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getImageUrl } from "@lib/imageUrl";
import { I18n } from "@i18n";
import { Image } from "@components/ui/image/Image";
export default function Error({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="">
      <div className="text-center">
        <h1 className="mt-8 mb-6!">
          <I18n i18nKey="title" namespace="error" />
        </h1>
        <Image
          src={getImageUrl("/img/goose.png")}
          alt="Goose"
          width={200}
          height={200}
          className="mx-auto mb-6 h-auto"
          preload={true}
        />
      </div>
    </div>
  );
}
