"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { useEffect } from "react";
import { Lato, Noto_Sans } from "next/font/google";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { GenericError } from "@components/ui/error/GenericError";

/*--------------------------------------------*
 * Styles
 *--------------------------------------------*/
import "@root/styles/app.css";

const notoSans = Noto_Sans({
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-noto-sans",
  subsets: ["latin"],
});

const lato = Lato({
  weight: ["400", "700"],
  variable: "--font-lato",
  subsets: ["latin"],
});

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en" className={`${notoSans.variable} ${lato.variable}`}>
      <body>
        <main className="pt-24">
          <GenericError />
        </main>
      </body>
    </html>
  );
}
