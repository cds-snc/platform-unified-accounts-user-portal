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
    <AuthPanel titleI18nKey="title" descriptionI18nKey="description" namespace="contact-us">
      <ContactUsForm siteKey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY ?? ""} />
    </AuthPanel>
  );
}
