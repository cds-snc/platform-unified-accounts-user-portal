/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getCurrentLanguage } from "@i18n/utils";
import { AuthPanel } from "@components/auth/AuthPanel";

/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/
import { PrivacyPolicyContentEn } from "./components/PrivacyPolicyContentEn";
import { PrivacyPolicyContentFr } from "./components/PrivacyPolicyContentFr";

export default async function PrivacyPolicyPage() {
  const language = await getCurrentLanguage();
  const Content = language === "fr" ? PrivacyPolicyContentFr : PrivacyPolicyContentEn;

  return (
    <AuthPanel
      titleI18nKey="title"
      descriptionI18nKey="none"
      namespace="privacy-policy"
      variant="wide"
    >
      <div data-testid="privacy-policy-content">
        <Content />
      </div>
    </AuthPanel>
  );
}
