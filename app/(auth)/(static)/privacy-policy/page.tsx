import EnContent from "@content/en/privacy-policy.mdx";
import FrContent from "@content/fr/privacy-policy.mdx";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getCurrentLanguage } from "@i18n/utils";
import { AuthPanel } from "@components/auth/AuthPanel";

export default async function PrivacyPolicyPage() {
  const language = await getCurrentLanguage();
  const Content = language === "fr" ? FrContent : EnContent;

  return (
    <AuthPanel titleI18nKey="privacy-policy:title" descriptionI18nKey="none" variant="wide">
      <div data-testid="privacy-policy-content">
        <Content />
      </div>
    </AuthPanel>
  );
}
