"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { logoutCurrentSession } from "@lib/server/session";
import { useTranslation } from "@i18n";
import { ChevronDown } from "@components/icons/ChevronDown";

type YourAccountDropdownProps = {
  userName: string;
  postLogoutRedirectUri?: string;
};

const DropdownMenuItem = ({
  href,
  text,
  onClick,
}: {
  href: string;
  text: string;
  onClick?: () => void;
}) => {
  return (
    <DropdownMenu.Item onClick={onClick} asChild>
      <Link
        className="block rounded-md p-2 text-sm text-black no-underline! outline-none visited:text-black hover:bg-gray-600 hover:text-white focus:bg-gray-600 focus:text-white-default"
        href={href}
      >
        {text}
      </Link>
    </DropdownMenu.Item>
  );
};

export const YourAccountDropdown = ({
  postLogoutRedirectUri,
  userName,
}: YourAccountDropdownProps) => {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { t } = useTranslation("header");
  const pathname = usePathname();

  async function handleLogout() {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    try {
      const result = await logoutCurrentSession({
        postLogoutRedirectUri,
      });

      if ("redirect" in result) {
        router.push(result.redirect);
      } else if ("error" in result) {
        // Fallback to logout page if direct logout fails
        router.push("/logout");
      }
    } catch {
      // Fallback to logout page
      router.push("/logout");
    }
    setIsLoggingOut(false);
  }
  // If it's a public path don't display
  if (["/", "/register"].includes(pathname)) {
    return null;
  }

  return (
    <>
      <div>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <div
              className="flex cursor-pointer rounded border-1 border-slate-500 px-3 py-1 hover:bg-gray-600 hover:text-white-default focus:bg-gray-600 focus:text-white-default hover:[&_svg]:fill-white focus:[&_svg]:fill-white"
              data-testid="yourAccountDropdown"
            >
              <span className="mr-1 inline-block">{userName}</span>
              <ChevronDown className="mt-0.5" />
            </div>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              data-testid="yourAccountDropdownContent"
              align="end"
              className={`z-1000 mt-1.5 min-w-57.5 rounded-lg border-1 border-slate-500 bg-white px-1.5 py-1 shadow-md`}
            >
              <DropdownMenuItem href={`/`} text={t("switchAccount")} />
              <DropdownMenuItem href="#" onClick={handleLogout} text={t("logout")} />
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </>
  );
};
