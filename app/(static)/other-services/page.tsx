import EnContent from "@content/en/other-services.mdx";
import FrContent from "@content/fr/other-services.mdx";

import { PageTitle } from "@components/ui/title/PageTitle";

import { ContentSwitcher } from "../components/ContentSwitcher";

const TermsOfUse = async () => {
  return (
    <div className="gc-richText">
      <PageTitle i18nKey="other-services:title" />
      <ContentSwitcher enContent={<EnContent />} frContent={<FrContent />} />
    </div>
  );
};

export default TermsOfUse;
