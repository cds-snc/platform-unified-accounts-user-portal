/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { cn } from "@lib/utils";
/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getImageUrl } from "@lib/utils/imageUrl";
import { I18n } from "@i18n";
import { Image } from "@components/ui/image/Image";

type CallOutProps = {
  iconSrc?: string;
  className?: string;
} & (
  | { i18nKey: string; children?: React.ReactNode }
  | {
      i18nKey?: never;
      children: React.ReactNode;
    }
);

export const CallOut = ({ iconSrc, i18nKey, className, children }: CallOutProps) => {
  return (
    <div className={cn("mb-4 flex items-start gap-4 rounded-lg bg-gray-50 p-4", className)}>
      {iconSrc && (
        <div className="flex h-8 w-8 items-center justify-center">
          <Image src={getImageUrl(iconSrc)} alt="" width={24} height={24} className="flex-none" />
        </div>
      )}
      <div>
        {children !== undefined ? (
          children
        ) : (
          <I18n
            i18nKey={i18nKey as string}
            namespace="beforeYouStart"
            tagName="div"
            className="mb-1 text-base"
          />
        )}
      </div>
    </div>
  );
};
