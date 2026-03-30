/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import Link from "next/link";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { ChevronDown } from "@components/icons/ChevronDown";

/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/
import { Avatar } from "./Avatar";
type Props = {
  loginName?: string;
  displayName?: string;
  showDropdown: boolean;
};

export function UserAvatar({ loginName, displayName, showDropdown }: Props) {
  return (
    <div className="flex h-full flex-row items-center rounded-3xl border-2 border-gcds-grayscale-300 p-2">
      {/* <div> */}
      <Avatar size="small" name={displayName ?? loginName ?? ""} loginName={loginName ?? ""} />
      {/* </div> */}
      <span className="ml-4 overflow-hidden pr-4 text-ellipsis">{loginName}</span>
      <span className="grow"></span>
      {showDropdown && (
        <Link
          href={"/account"}
          className={`mr-1 ml-4 flex items-center justify-center p-1 transition-all hover:bg-black/10 dark:hover:bg-white/10`}
        >
          <ChevronDown className="size-4" />
        </Link>
      )}
    </div>
  );
}
