/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/

import { AuthPanel } from "@components/auth/AuthPanel";

/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/
import { ContactUsForm } from "./components/ContactUsForm";

export default async function ContactUsPage() {
  return (
    <AuthPanel titleI18nKey="contact-us:title" descriptionI18nKey="contact-us:description">
      <ContactUsForm siteKey={process.env.HCAPTCHA_SITE_KEY ?? ""} />
    </AuthPanel>
  );
}
