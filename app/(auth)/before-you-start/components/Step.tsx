/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import React from "react";

import { cn } from "@lib/utils";
/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getImageUrl } from "@lib/utils/imageUrl";
import { I18n } from "@i18n";
import { Image } from "@components/ui/image/Image";

export const Step = ({
  titleKey,
  descKey,
  iconSrc,
  namespace = "beforeYouStart",
  children,
  className,
}: {
  titleKey: string;
  descKey?: string;
  iconSrc: string;
  namespace?: string;
  children?: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn("flex items-start gap-5", className)}>
      <div className="flex h-12 w-10 items-center justify-center rounded-xl border-1 border-gcds-purple-450 bg-violet-50">
        <Image src={getImageUrl(iconSrc)} alt="" width={24} height={24} className="flex-none" />
      </div>
      <div className="min-w-0">
        <I18n
          i18nKey={titleKey}
          namespace={namespace}
          tagName="div"
          className="text-1xl mb-1 font-bold"
        />
        {descKey && (
          <I18n
            i18nKey={descKey}
            namespace={namespace}
            tagName="div"
            className="text-1xl text-gcds-gray-800"
          />
        )}

        {children}
      </div>
    </div>
  );
};
