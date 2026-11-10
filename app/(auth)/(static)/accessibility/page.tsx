import EnContent from "@content/en/accessibility.mdx";
import FrContent from "@content/fr/accessibility.mdx";

import { AuthPanel } from "@components/auth/AuthPanel";

import { ContentSwitcher } from "../components/ContentSwitcher";

const Accessibility = async () => {
  return (
    <AuthPanel
      titleI18nKey="none"
      pageTitleI18nKey="accessibility:title"
      descriptionI18nKey="none"
      variant="wide"
    >
      <div data-testid="accessibility-content">
        <ContentSwitcher en={<EnContent />} fr={<FrContent />} />
      </div>
    </AuthPanel>
  );
};

export default Accessibility;
