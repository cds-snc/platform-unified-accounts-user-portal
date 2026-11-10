import EnContent from "@content/en/sla.mdx";
import FrContent from "@content/fr/sla.mdx";

import { getCurrentLanguage } from "@i18n/utils";
import { AuthPanel } from "@components/auth/AuthPanel";

const SLA = async () => {
  const language = await getCurrentLanguage();
  const Content = language === "fr" ? FrContent : EnContent;

  return (
    <AuthPanel titleI18nKey="sla:title" descriptionI18nKey="none" variant="wide">
      <div data-testid="sla-content">
        <Content />
      </div>
    </AuthPanel>
  );
};

export default SLA;
