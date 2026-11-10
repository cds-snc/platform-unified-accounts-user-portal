import EnContent from "@content/en/accessibility.mdx";
import FrContent from "@content/fr/accessibility.mdx";

import { getCurrentLanguage } from "@i18n/utils";
import { AuthPanel } from "@components/auth/AuthPanel";

const Accessibility = async () => {
  const language = await getCurrentLanguage();
  const Content = language === "fr" ? FrContent : EnContent;

  return (
    <AuthPanel titleI18nKey="accessibility:title" descriptionI18nKey="none" variant="wide">
      <div data-testid="accessibility-content">
        <Content />
      </div>
    </AuthPanel>
  );
};

export default Accessibility;
