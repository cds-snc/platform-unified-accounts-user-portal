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
 * Local Relative
 *--------------------------------------------*/
import { RegisterForm } from "./components/RegisterForm";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await serverTranslation("register");
  return { title: t("title") };
}

export default async function Page(props: { searchParams: Promise<SearchParams> }) {
  const searchParams = await props.searchParams;
  const { requestId } = searchParams;

  return (
    <AuthPanel titleI18nKey="title" descriptionI18nKey="description" namespace="register">
      <RegisterForm requestId={requestId} />
    </AuthPanel>
  );
}
