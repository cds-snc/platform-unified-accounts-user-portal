/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { Metadata } from "next";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { serverTranslation } from "@i18n/server";
import { AuthPanel } from "@components/auth/AuthPanel";

/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/
import { ContactUsForm } from "./components/ContactUsForm";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await serverTranslation("contact-us");
  return { title: t("title") };
}

export default async function ContactUsPage() {
  return (
    <AuthPanel titleI18nKey="title" descriptionI18nKey="description" namespace="contact-us">
      <ContactUsForm />
    </AuthPanel>
  );
}
