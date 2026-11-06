"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { useRouter } from "next/navigation";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { I18n } from "@i18n";

/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/
import { Button } from "./Button";
import { Theme } from "./themes";
export function BackButton({ theme = "secondary" }: { theme?: Theme }) {
  const router = useRouter();
  return (
    <Button onClick={() => router.back()} type="button" theme={theme}>
      <I18n i18nKey="button.back" />
    </Button>
  );
}
