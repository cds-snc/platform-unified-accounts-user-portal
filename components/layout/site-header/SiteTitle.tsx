/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { I18n } from "@i18n";

/*--------------------------------------------*
 * Component
 *--------------------------------------------*/
export const SiteTitle = ({ className }: { className?: string }) => {
  return (
    <span
      className={
        (className ? className + " " : "") +
        "ml-3 inline-block text-[24px] font-semibold leading-10 text-black"
      }
    >
      <I18n i18nKey="title" namespace="common" />
    </span>
  );
};

export default SiteTitle;
