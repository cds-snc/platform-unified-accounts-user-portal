"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { useEffect } from "react";
import Image from "next/image";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getImageUrl } from "@lib/imageUrl";
import { I18n } from "@i18n";
export default function Error({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="">
      <div className="text-center">
        <h1 className="mt-8 !mb-6">
          <I18n i18nKey="title" namespace="error" />
        </h1>
        <Image
          src={getImageUrl("/img/goose.png")}
          alt="Goose"
          width={200}
          height={200}
          className="mx-auto mb-6"
          priority
        />
      </div>
    </div>
  );
}
