"use server";
import { AuthPanel } from "@components/auth/AuthPanel";

import { ContentSwitcher } from "../../../(static)/components/ContentSwitcher";

import { Actions } from "./components/Actions";
import EnContent from "./content/en.mdx";
import FrContent from "./content/fr.mdx";

export const AcceptTerms = async () => {
  return (
    <AuthPanel titleI18nKey="acceptTOU:title" descriptionI18nKey="none" variant="wide">
      <div data-testid="acceptTOU-content">
        <ContentSwitcher en={<EnContent />} fr={<FrContent />} />
      </div>
      <Actions />
    </AuthPanel>
  );
};
