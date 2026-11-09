import EnContent from "@content/en/terms-of-use.mdx";
import FrContent from "@content/fr/terms-of-use.mdx";

import { getCurrentLanguage } from "@i18n/utils";
import { AuthPanel } from "@components/auth/AuthPanel";

const TermsOfUse = async () => {
  const language = await getCurrentLanguage();
  const Content = language === "fr" ? FrContent : EnContent;

  return (
    <AuthPanel titleI18nKey="terms-of-use:title" descriptionI18nKey="none" variant="wide">
      <div data-testid="terms-of-use-content">
        <Content />
      </div>
    </AuthPanel>
  );
};

export default TermsOfUse;
