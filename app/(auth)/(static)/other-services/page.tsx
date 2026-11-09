import EnContent from "@content/en/other-services.mdx";
import FrContent from "@content/fr/other-services.mdx";

import { getCurrentLanguage } from "@i18n/utils";
import { AuthPanel } from "@components/auth/AuthPanel";

const OtherServices = async () => {
  const language = await getCurrentLanguage();
  const Content = language === "fr" ? FrContent : EnContent;

  return (
    <AuthPanel titleI18nKey="other-services:title" descriptionI18nKey="none" variant="wide">
      <div data-testid="other-services-content">
        <Content />
      </div>
    </AuthPanel>
  );
};

export default OtherServices;
