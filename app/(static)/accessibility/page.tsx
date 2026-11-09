import EnContent from "@content/en/accessibility.mdx";
import FrContent from "@content/fr/accessibility.mdx";

import { PageTitle } from "@components/ui/title/PageTitle";

import { ContentSwitcher } from "../components/ContentSwitcher";

const TermsOfUse = async () => {
  return (
    <div className="gc-richText">
      <PageTitle i18nKey="accessibility:title" />
      <ContentSwitcher enContent={<EnContent />} frContent={<FrContent />} />
    </div>
  );
};

export default TermsOfUse;
