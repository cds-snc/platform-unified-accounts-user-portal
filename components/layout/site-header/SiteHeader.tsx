"use client";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { cn } from "@lib/utils";
import { SkipLink } from "@components/ui/skip-link/SkipLink";

/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/
import { SiteLink } from "./SiteLink";

export const SiteHeader = ({
  skipLink = true,
  children,
}: {
  skipLink?: boolean;
  children?: React.ReactNode;
}) => {
  return (
    <>
      {skipLink && <SkipLink />}
      <header className={cn("mb-5 border-b-1 border-gray-500 bg-white")}>
        <div
          className="mx-auto grid max-w-[71.25rem] grid-cols-[auto_1fr] items-center gap-4 px-4 py-2 laptop:px-0"
          style={{ gridTemplateAreas: '"logo links"' }}
        >
          <div style={{ gridArea: "logo" }}>
            <SiteLink href="/" />
          </div>
          <div style={{ gridArea: "links" }} className="flex items-center justify-end gap-4">
            {children}
          </div>
        </div>
      </header>
    </>
  );
};
