/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getImageUrl } from "@lib/imageUrl";
import { cn } from "@lib/utils";
import { Version } from "@components/layout/footer/Version";
export const Footer = async ({ children }: { children?: React.ReactNode }) => {
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
            <img className="h-10 lg:h-8" alt="fip.text" src={getImageUrl("/img/wmms-blk.svg")} />
          </picture>
        </div>
      </div>
    </footer>
  );
};
