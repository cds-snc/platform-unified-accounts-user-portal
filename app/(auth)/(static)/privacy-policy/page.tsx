import EnContent from "@content/en/privacy-policy.mdx";
import FrContent from "@content/fr/privacy-policy.mdx";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { AuthPanel } from "@components/auth/AuthPanel";

import { ContentSwitcher } from "../components/ContentSwitcher";

export default async function PrivacyPolicyPage() {
  return (
    <AuthPanel
      titleI18nKey="none"
      pageTitleI18nKey="privacy-policy:title"
      descriptionI18nKey="none"
      variant="wide"
    >
      <div data-testid="privacy-policy-content">
        <ContentSwitcher en={<EnContent />} fr={<FrContent />} />
      </div>
    </AuthPanel>
  );
}
