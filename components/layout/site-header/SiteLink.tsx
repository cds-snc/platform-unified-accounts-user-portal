/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import Link from "next/link";

import { ManageAccountsIcon } from "@components/icons/ManageAccounts";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import SiteTitle from "./SiteTitle";
export const SiteLink = ({ href }: { href: string }) => {
  return (
    <Link
      href={href}
      prefetch={false}
      id="logo"
      className="flex items-center no-underline focus:bg-white"
    >
      <span className="inline-block">
        <ManageAccountsIcon className="size-12" />
      </span>
      <SiteTitle />
    </Link>
  );
};
