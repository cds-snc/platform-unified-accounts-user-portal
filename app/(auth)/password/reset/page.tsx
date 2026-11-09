/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/
import { SearchParams } from "@lib/utils";
/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { AuthPanel } from "@components/auth/AuthPanel";

import { UserNameForm } from "./components/UserNameForm";

export default async function Page(props: { searchParams: Promise<SearchParams> }) {
  const { requestId } = await props.searchParams;
  return (
    <AuthPanel
      titleI18nKey="password:reset.start.title"
      descriptionI18nKey="password:reset.start.description"
    >
      <UserNameForm requestId={requestId} />
    </AuthPanel>
  );
}
