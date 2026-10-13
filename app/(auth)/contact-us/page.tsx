/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/

import type { SearchParams } from "@lib/utils";
import { isContactUsIssueType } from "@lib/validation/contactUsIssueTypes";
import { AuthPanel } from "@components/auth/AuthPanel";

/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/
import { ContactUsForm } from "./components/ContactUsForm";

export default async function ContactUsPage(props: { searchParams: Promise<SearchParams> }) {
  const { issueType } = await props.searchParams;
  const defaultIssueType = isContactUsIssueType(issueType) ? issueType : undefined;

  return (
    <AuthPanel titleI18nKey="title" descriptionI18nKey="description" namespace="contact-us">
      <ContactUsForm
        siteKey={process.env.HCAPTCHA_SITE_KEY ?? ""}
        defaultIssueType={defaultIssueType}
      />
    </AuthPanel>
  );
}
