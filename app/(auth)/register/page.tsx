/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { SearchParams } from "@lib/utils";
import { AuthPanel } from "@components/auth/AuthPanel";

/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/
import { RegisterForm } from "./components/RegisterForm";

export default async function Page(props: { searchParams: Promise<SearchParams> }) {
  const searchParams = await props.searchParams;
  const { requestId } = searchParams;

  return (
    <AuthPanel titleI18nKey="title" descriptionI18nKey="description" namespace="register">
      <RegisterForm requestId={requestId} />
    </AuthPanel>
  );
}
