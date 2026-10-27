"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { useEffect } from "react";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { useSiteConfig } from "@components/contexts/SiteConfigContext";
import { GenericError } from "@components/ui/error/GenericError";

export default function Error({
  error,
  errorCode = "APP_BOUNDARY_ERROR",
}: {
  error: Error & { digest?: string };
  errorCode?: string;
}) {
  const { getSiteLink } = useSiteConfig();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="pt-24">
      <GenericError aboutLink={getSiteLink("about")} errorCode={errorCode} />
    </main>
  );
}
