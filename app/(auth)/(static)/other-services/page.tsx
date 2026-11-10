import EnContent from "@content/en/other-services.mdx";
import FrContent from "@content/fr/other-services.mdx";

import { AuthPanel } from "@components/auth/AuthPanel";

import { ContentSwitcher } from "../components/ContentSwitcher";

const OtherServices = async () => {
  return (
    <AuthPanel
      titleI18nKey="none"
      pageTitleI18nKey="other-services:title"
      descriptionI18nKey="none"
      variant="wide"
    >
      <div data-testid="other-services-content">
        <ContentSwitcher en={<EnContent />} fr={<FrContent />} />
      </div>
    </AuthPanel>
  );
};

export default OtherServices;
