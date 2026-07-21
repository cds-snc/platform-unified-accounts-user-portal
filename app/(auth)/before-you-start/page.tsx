/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { Metadata } from "next";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { SearchParams } from "@lib/utils";
import { serverTranslation } from "@i18n/server";
import { AuthPanel } from "@components/auth/AuthPanel";


/*--------------------------------------------*
 * Parent Relative
 *--------------------------------------------*/
import { Title } from "./components/Title";


export default async function Page(props: { searchParams: Promise<SearchParams> }) {
  const searchParams = await props.searchParams;
  const { requestId } = searchParams;

  return (
    <AuthPanel titleI18nKey="none" descriptionI18nKey="" namespace="beforeYouStart">
<Title />
    </AuthPanel>
  );
}