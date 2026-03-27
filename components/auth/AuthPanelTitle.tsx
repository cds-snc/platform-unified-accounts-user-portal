/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { I18n } from "@i18n";
export const AuthPanelTitle = ({
  i18nKey,
  namespace,
  data,
  className,
}: {
  i18nKey: string;
  namespace: string;
  data?: Record<string, unknown>;
  className?: string;
}) => {
  return (
    <div className={`mt-4 mb-6 ${className || ""}`}>
      <h1 className="!mb-0">
        <I18n i18nKey={i18nKey} namespace={namespace} data={data} />
      </h1>
    </div>
  );
};
