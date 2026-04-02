/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { SkipLink } from "@components/ui/skip-link/SkipLink";

/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/
import { BrandContainer } from "./BrandContainer";
import { Fip } from "./Fip";

export const GcdsHeader = ({
  language,
  skipLink = true,
  children,
}: {
  language: string;
  showLanguageToggle?: boolean;
  skipLink?: boolean;
  children?: React.ReactNode;
}) => {
  return (
    <div className="gcds-header__container">
      <header className="gcds-header">
        {skipLink && <SkipLink />}
        <BrandContainer>
          <Fip language={language} />
          <div className="brand__toggle">{children}</div>
        </BrandContainer>
      </header>
    </div>
  );
};
