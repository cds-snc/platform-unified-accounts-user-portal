"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { logoutCurrentSession } from "@lib/actions/logout";
import { useTranslation } from "@i18n";
import { ChevronDown } from "@components/icons/ChevronDown";

type YourAccountDropdownProps = {
  userName: string;
  postLogoutRedirectUri?: string;
};

const menuItemClass =
  "block w-full rounded-md p-2 text-left text-sm text-black outline-none hover:bg-gcds-grayscale-600 hover:text-white focus:bg-gcds-grayscale-600 focus:text-white-default";

const DropdownMenuItem = ({ href, text }: { href: string; text: string }) => {
  return (
    <DropdownMenu.Item asChild>
      <Link className={`${menuItemClass} no-underline! visited:text-black`} href={href}>
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
  const [triggerWidth, setTriggerWidth] = useState<number>();
  const triggerRef = useRef<HTMLButtonElement>(null);
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
        <DropdownMenu.Root
          onOpenChange={(open) => {
            if (open && triggerRef.current) {
              setTriggerWidth(triggerRef.current.getBoundingClientRect().width);
            }
          }}
        >
          <DropdownMenu.Trigger asChild>
            <button
              ref={triggerRef}
              type="button"
              className="flex cursor-pointer rounded border-1 border-slate-500 px-3 py-1 hover:bg-gcds-grayscale-600 hover:text-white-default focus:bg-gcds-grayscale-600 focus:text-white-default hover:[&_svg]:fill-white focus:[&_svg]:fill-white"
              data-testid="yourAccountDropdown"
            >
              <span className="mr-1 inline-block">{userName}</span>
              <ChevronDown className="mt-0.5" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              data-testid="yourAccountDropdownContent"
              align="end"
              className="z-1000 mt-1.5 rounded-lg border-1 border-slate-500 bg-white px-1.5 py-1 shadow-md"
              style={triggerWidth ? { width: triggerWidth } : undefined}
            >
              <DropdownMenuItem href={`/`} text={t("switchAccount")} />
              <DropdownMenu.Item asChild onSelect={handleLogout}>
                <button type="button" className={menuItemClass}>
                  {t("logout")}
                </button>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </>
  );
};
