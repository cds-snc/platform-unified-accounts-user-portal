/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { I18n } from "@i18n";
import { Logout } from "@components/auth/Logout";
import { SiteHeader } from "@components/layout/site-header/SiteHeader";
import LanguageToggle from "@components/ui/language-toggle/LanguageToggle";
// Note: This is a single column layout as we don't need the left nav yet.

export default async function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-soft">
      <SiteHeader>
        <div className="flex items-center gap-4">
          <Logout className="mr-2 text-sm" />
          <LanguageToggle />
        </div>
      </SiteHeader>
      <main id="content" className="mx-auto max-w-[71.25rem] px-6 py-2 laptop:px-0">
        {/* Needed for heading structure. Hidden until there is an H1 part of the design */}
        <h1 className="sr-only">
          <I18n i18nKey={"title"} namespace={"account"} />
        </h1>
        <div className="mb-20 px-16">{children}</div>
      </main>
    </div>
  );
}
