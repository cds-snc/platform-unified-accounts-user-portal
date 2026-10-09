/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { cn } from "@lib/utils";
import { getImageUrl } from "@lib/utils/imageUrl";
import { serverTranslation } from "@i18n/server";
import { Version } from "@components/layout/footer/Version";
export const Footer = async ({ children }: { children?: React.ReactNode }) => {
  const { t } = await serverTranslation("fip");

  return (
    <footer
      className={cn(
        "mt-16 flex-none border-0 bg-gray-100 px-4 py-0 tablet:px-16 laptop:px-32 lg:mt-10"
      )}
      data-server="true"
      data-testid="footer"
    >
      <div className="flex flex-row items-center justify-between pt-10 pb-5 lg:flex-col lg:items-start lg:gap-4">
        <div>
          <>
            <nav className="inline-block">{children}</nav>
          </>
          <Version />
        </div>

        <div className="min-w-42">
          <picture>
            <img className="h-10 lg:h-8" alt={t("text")} src={getImageUrl("/img/wmms-blk.svg")} />
          </picture>
        </div>
      </div>
    </footer>
  );
};

export const FooterSkeleton = () => (
  <footer
    className={cn(
      "mt-16 flex-none border-0 bg-gray-100 px-4 py-0 tablet:px-16 laptop:px-32 lg:mt-10"
    )}
    data-server="true"
    data-testid="footer"
  >
    <div className="flex flex-row items-center justify-between pt-10 pb-5 lg:flex-col lg:items-start lg:gap-4">
      <div></div>

      <div className="min-w-42">
        <picture>
          {/* Decorative placeholder; the above loaded footer announces the image. */}
          <img className="h-10 lg:h-8" alt="" src={getImageUrl("/img/wmms-blk.svg")} />
        </picture>
      </div>
    </div>
  </footer>
);
