/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/

import { Viewport } from "next";
import { Lato, Noto_Sans } from "next/font/google";
import { cookies, headers } from "next/headers";
import { dir } from "i18next";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { languages } from "@i18n/settings";
import RouterDebugger from "@components/debugging/RouterDebugger";

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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function Layout({ children }: { children: React.ReactNode }) {
  const [requestCookies, requestHeaders] = await Promise.all([cookies(), headers()]);
  const locale = requestCookies.get("i18next")?.value ?? languages[0];
  const nonce = requestHeaders.get("x-nonce") ?? undefined;

  return (
    <html lang={locale} dir={dir(locale)} className={`${notoSans.variable} ${lato.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta charSet="utf-8" />
        <link
          rel="shortcut icon"
          href={`${process.env.NEXT_PUBLIC_BASE_PATH}/favicon.ico`}
          type="image/x-icon"
          sizes="32x32"
        />
        {process.env.NEXT_PUBLIC_BASE_PATH && (
          <style nonce={nonce}>
            {`@font-face {
  font-family: "gcds-icons";
  src: url("${process.env.NEXT_PUBLIC_BASE_PATH}/fonts/icons/gcds-icons.eot");
  src:
  url("${process.env.NEXT_PUBLIC_BASE_PATH}/fonts/icons/gcds-icons.eot#iefix") format("embedded-opentype"),
  url("${process.env.NEXT_PUBLIC_BASE_PATH}/fonts/icons/gcds-icons.ttf") format("truetype"),
  url("${process.env.NEXT_PUBLIC_BASE_PATH}/fonts/icons/gcds-icons.woff") format("woff"),
  url("${process.env.NEXT_PUBLIC_BASE_PATH}/fonts/icons/gcds-icons.svg") format("svg");
  font-weight: normal;
  font-style: normal;
  font-display: block;
  }`}
          </style>
        )}
      </head>
      <body>
        {process.env.DEBUG && <RouterDebugger />}
        {children}
      </body>
    </html>
  );
}
