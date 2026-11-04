import { useTranslation } from "@i18n";
import { CircleCheckIcon } from "@components/icons/CircleCheckIcon";
export const AllSet = () => {
  const { t } = useTranslation("allSet");
  return (
    <>
      <div className="mb-8 flex items-center gap-3">
        <h1 id="page-heading" className="mb-0! text-4xl font-bold">
          {t("title")}
        </h1>
        <CircleCheckIcon className="size-10 fill-gcds-green-700" />
      </div>

      {/* Description */}
      <p className="mb-8">{t("description")}</p>
    </>
  );
};
