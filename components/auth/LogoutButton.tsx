"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { useState } from "react";
import { useRouter } from "next/navigation";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { logoutCurrentSession } from "@lib/server/session";
type LogoutButtonProps = {
  className?: string;
  label: string;
  postLogoutRedirectUri?: string;
};

export function LogoutButton({ className, label, postLogoutRedirectUri }: LogoutButtonProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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

  return (
    <button
      onClick={handleLogout}
      className={`cursor-pointer border-none bg-transparent p-0 !text-lg text-inherit underline hover:no-underline ${className ?? ""}`}
      aria-label={label}
      disabled={isLoggingOut}
    >
      {label}
    </button>
  );
}
