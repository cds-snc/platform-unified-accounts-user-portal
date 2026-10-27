/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/

import { getCallingApp } from "@lib/oidcClient";
/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getImageUrl } from "@lib/utils/imageUrl";
import { I18n } from "@i18n";
import { RequestingAppProvider } from "@components/contexts/RequestingAppContext";
import { ChevronRight } from "@components/icons/ChevronRight";
import { CircleCheckIcon } from "@components/icons/CircleCheckIcon";
import { Image } from "@components/ui/image/Image";
import { PageTitle } from "@components/ui/title/PageTitle";

import { NextAction, NextStepAction } from "./NextStepsAction";
/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/
import { NextStepsTitle } from "./NextStepsTitle";

interface NextStepsProps {
  action: NextAction;
  titleI18nKey: string;
  pageTitleI18nKey?: string;
  listI18nKeys: { key: string; checked?: boolean }[];
  hintI18nKey?: string;
  imageSrc?: string;
  namespace: string;
  variant?: "default" | "narrow" | "wide";
  requestId?: string;
}

export const NextSteps = async ({
  action,
  titleI18nKey,
  pageTitleI18nKey,
  listI18nKeys,
  hintI18nKey,
  imageSrc,
  namespace,
  variant,
  requestId,
}: NextStepsProps) => {
  const callingApp = requestId ? await getCallingApp(requestId) : undefined;

  const panelId =
    variant === "wide"
      ? "auth-panel-wide"
      : variant === "narrow"
        ? "auth-panel-narrow"
        : "auth-panel";
  return (
    <RequestingAppProvider appName={callingApp}>
      <div id={panelId}>
        <PageTitle i18nKey={pageTitleI18nKey ?? titleI18nKey} namespace={namespace} />
        {imageSrc && (
          <div className="mb-6 flex justify-center">
            <Image
              src={getImageUrl(imageSrc)}
              alt=""
              width={200}
              height={200}
              style={{
                width: "90%",
                height: "auto",
              }}
              preload={true}
            />
          </div>
        )}

        <NextStepsTitle i18nKey={titleI18nKey} namespace={namespace} />
        <div className="flex flex-col">
          {listI18nKeys.map((listKey) => (
            <div key={listKey.key} className="mb-4 flex flex-row gap-4">
              <div className="basis-1/8">
                {listKey.checked ? (
                  <CircleCheckIcon className="w-12 items-center fill-gcds-green-700" />
                ) : (
                  <ChevronRight className="h-10 w-10 items-center fill-black" />
                )}
              </div>
              <div className="flex items-center">
                <I18n i18nKey={listKey.key} namespace={namespace} />
              </div>
            </div>
          ))}
        </div>
        <NextStepAction action={action} text="incomplete.action" namespace={namespace} />
        {hintI18nKey && (
          <div className="mt-4">
            <I18n i18nKey={hintI18nKey} namespace={namespace} />
          </div>
        )}
      </div>
    </RequestingAppProvider>
  );
};
