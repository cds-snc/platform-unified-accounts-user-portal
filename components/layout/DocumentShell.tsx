/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { Lato, Noto_Sans } from "next/font/google";

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

interface DocumentShellProps {
  children: React.ReactNode;
  locale?: string;
  direction?: "ltr" | "rtl";
  iconFontNonce?: string;
  includeIconFont?: boolean;
}

export function DocumentShell({
  children,
  locale = "en",
  direction = "ltr",
  iconFontNonce,
  includeIconFont = false,
}: DocumentShellProps) {
  return (
    <html lang={locale} dir={direction} className={`${notoSans.variable} ${lato.variable}`}>
      {/* eslint-disable-next-line @next/next/no-head-element -- Shared root layout and global error document shell. */}
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta charSet="utf-8" />
        <link
          rel="shortcut icon"
          href={`${process.env.NEXT_PUBLIC_BASE_PATH}/favicon.ico`}
          type="image/x-icon"
          sizes="32x32"
        />
        {includeIconFont && (
          <style nonce={iconFontNonce}>
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
      <body>{children}</body>
    </html>
  );
}
