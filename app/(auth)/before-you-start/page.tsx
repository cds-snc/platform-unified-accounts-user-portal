/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { Metadata } from "next";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { SearchParams } from "@lib/utils";
import { serverTranslation } from "@i18n/server";
import { I18n } from "@i18n/Translate";
import { AuthPanel } from "@components/auth/AuthPanel";

import ActionsClient from "./components/ActionsClient";
import { CallOut } from "./components/CallOut";
import { Step } from "./components/Step";
/*--------------------------------------------*
 * Parent Relative
 *--------------------------------------------*/
import { Title } from "./components/Title";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await serverTranslation("beforeYouStart");
  return { title: t("title") };
}

export default async function Page(props: { searchParams: Promise<SearchParams> }) {
  const searchParams = await props.searchParams;
  const { requestId } = searchParams;

  return (
    <div data-request-id={requestId}>
      <AuthPanel
        titleI18nKey="none"
        descriptionI18nKey=""
        namespace="beforeYouStart"
        variant="narrow"
      >
        <Title />
        <div className="mt-6 space-y-6">
          {/* Step 1: Verify your email address */}
          <Step
            titleKey="step1.title"
            descKey="step1.description"
            iconSrc="/img/email_@.svg"
          ></Step>
          <CallOut className="mb-10">
            <>
              <I18n
                i18nKey="step1.callout1"
                namespace="beforeYouStart"
                tagName="div"
                className="mb-4 text-base"
              />

              <I18n
                i18nKey="step1.callout2"
                namespace="beforeYouStart"
                tagName="div"
                className="mb-0 text-base"
              />
            </>
          </CallOut>
          {/* Step 2: Set up two-factor authentication */}
          <Step
            titleKey="step2.title"
            descKey="step2.description"
            iconSrc="/img/lock__circle_open.svg"
          ></Step>
          <div className="mt-3">
            <CallOut iconSrc="/img/fingerprint_sm_blk.svg" i18nKey="step2.callout1" />
            <CallOut iconSrc="/img/qr_code_scanner.svg" i18nKey="step2.callout2" />
          </div>
        </div>
      </AuthPanel>
      <ActionsClient requestId={requestId} />
    </div>
  );
}
