"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import Image from "next/image";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { cn } from "@lib/utils";
interface AvatarProps {
  name: string | null | undefined;
  loginName: string;
  imageUrl?: string;
  size?: "small" | "base" | "large";
  shadow?: boolean;
}

export function getInitials(name: string, loginName: string) {
  let credentials = "";
  if (name) {
    const split = name.split(" ");
    if (split) {
      const initials = split[0].charAt(0) + (split[1] ? split[1].charAt(0) : "");
      credentials = initials;
    } else {
      credentials = name.charAt(0);
    }
  } else {
    const username = loginName.split("@")[0];
    let separator = "_";
    if (username.includes("-")) {
      separator = "-";
    }
    if (username.includes(".")) {
      separator = ".";
    }
    const split = username.split(separator);
    const initials = split[0].charAt(0) + (split[1] ? split[1].charAt(0) : "");
    credentials = initials;
  }

  return credentials;
}

export function Avatar({ size = "base", name, loginName, imageUrl, shadow }: AvatarProps) {
  const credentials = getInitials(name ?? loginName, loginName);

  return (
    <div
      className={cn(
        "pointer-events-none flex size-full flex-shrink-0 cursor-default items-center justify-center rounded-full bg-gcds-blue-500 text-white transition-colors duration-200",
        shadow && "shadow",
        {
          "h-20 w-20 font-normal": size === "large",
          "size-[38px] font-bold": size === "base",
          "!h-[32px] !w-[32px] text-[13px] font-bold": size === "small",
          "size-12": size !== "large" && size !== "base" && size !== "small",
        }
      )}
    >
      {imageUrl ? (
        <Image
          height={48}
          width={48}
          alt="avatar"
          className="size-full rounded-lg border"
          src={imageUrl}
          style={{ color: "" }}
        />
      ) : (
        <span className={cn("uppercase", size === "large" ? "text-xl" : "text-13px")}>
          {credentials}
        </span>
      )}
    </div>
  );
}
