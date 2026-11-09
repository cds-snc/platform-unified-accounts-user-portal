import EnContent from "@content/en/sla.mdx";
import FrContent from "@content/fr/sla.mdx";

import { PageTitle } from "@components/ui/title/PageTitle";

import { ContentSwitcher } from "../components/ContentSwitcher";

const TermsOfUse = async () => {
  return (
    <div className="gc-richText">
      <PageTitle i18nKey="sla:title" />
      <ContentSwitcher enContent={<EnContent />} frContent={<FrContent />} />
    </div>
  );
};

export default TermsOfUse;
