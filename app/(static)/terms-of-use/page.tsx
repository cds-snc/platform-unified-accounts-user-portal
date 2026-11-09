import EnContent from "@content/en/terms-of-use.mdx";
import FrContent from "@content/fr/terms-of-use.mdx";

import { PageTitle } from "@components/ui/title/PageTitle";

import { ContentSwitcher } from "../components/ContentSwitcher";

const TermsOfUse = async () => {
  return (
    <div className="gc-richText">
      <PageTitle i18nKey="terms-of-use:title" />
      <ContentSwitcher enContent={<EnContent />} frContent={<FrContent />} />
    </div>
  );
};

export default TermsOfUse;
