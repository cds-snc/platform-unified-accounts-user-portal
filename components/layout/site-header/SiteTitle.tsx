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
        "ml-3 inline-block text-[24px] font-semibold leading-10 text-[#1B00C2]"
      }
    >
      <I18n i18nKey="title" namespace="common" />
    </span>
  );
};

export default SiteTitle;
