/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { headers } from "next/headers";
import Script from "next/script";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { AuthPanel } from "@components/auth/AuthPanel";

/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/
import { ContactUsForm } from "./components/ContactUsForm";

export default async function ContactUsPage() {
  const requestHeaders = await headers();
  const nonce = requestHeaders.get("x-nonce") ?? undefined;
  const wafIntegrationUrl = process.env.NEXT_PUBLIC_WAF_INTEGRATION_URL;

  return (
    <AuthPanel titleI18nKey="title" descriptionI18nKey="description" namespace="contact-us">
      {wafIntegrationUrl && (
        <Script src={`${wafIntegrationUrl}/jsapi.js`} strategy="afterInteractive" nonce={nonce} />
      )}
      <ContactUsForm siteKey={process.env.HCAPTCHA_SITE_KEY ?? ""} />
    </AuthPanel>
  );
}
