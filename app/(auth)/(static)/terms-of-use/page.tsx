import EnContent from "@content/en/terms-of-use.mdx";
import FrContent from "@content/fr/terms-of-use.mdx";

import { AuthPanel } from "@components/auth/AuthPanel";

import { ContentSwitcher } from "../components/ContentSwitcher";

const TermsOfUse = async () => {
  return (
    <AuthPanel
      titleI18nKey="none"
      pageTitleI18nKey="terms-of-use:title"
      descriptionI18nKey="none"
      variant="wide"
    >
      <div data-testid="terms-of-use-content">
        <ContentSwitcher en={<EnContent />} fr={<FrContent />} />
      </div>
    </AuthPanel>
  );
};

export default TermsOfUse;
