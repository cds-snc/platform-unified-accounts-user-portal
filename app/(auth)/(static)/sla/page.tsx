import EnContent from "@content/en/sla.mdx";
import FrContent from "@content/fr/sla.mdx";

import { AuthPanel } from "@components/auth/AuthPanel";

import { ContentSwitcher } from "../components/ContentSwitcher";

const SLA = async () => {
  return (
    <AuthPanel
      titleI18nKey="none"
      pageTitleI18nKey="sla:title"
      descriptionI18nKey="none"
      variant="wide"
    >
      <div data-testid="sla-content">
        <ContentSwitcher en={<EnContent />} fr={<FrContent />} />
      </div>
    </AuthPanel>
  );
};

export default SLA;
