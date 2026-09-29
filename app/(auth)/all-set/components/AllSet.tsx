import { I18n } from "@i18n";
import { CircleCheckIcon } from "@components/icons/CircleCheckIcon";
export const AllSet = () => {
  return (
    <>
      <div className="mb-8 flex items-center gap-3">
        <h1 className="mb-0! text-4xl font-bold">
          <I18n i18nKey="title" namespace="allSet" />
        </h1>
        <CircleCheckIcon className="size-10 fill-gcds-green-700" />
      </div>

      {/* Description */}
      <p className="mb-8">
        <I18n i18nKey="description" namespace="allSet" />
      </p>
    </>
  );
};
