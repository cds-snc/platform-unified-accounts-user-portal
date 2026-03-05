/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { Logout } from "@components/auth/Logout";
import { SiteHeader } from "@components/layout/site-header/SiteHeader";
import LanguageToggle from "@components/ui/language-toggle/LanguageToggle";

/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/
import { AccountNavigation } from "./components/AccountNavigation";

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
        <div className="mb-20 grid items-start gap-6 py-4 tablet:grid-cols-[22rem_1fr] tablet:gap-8">
          <aside className="w-full">
            <AccountNavigation />
          </aside>
          <section className="min-w-0">{children}</section>
        </div>
      </main>
    </div>
  );
}
