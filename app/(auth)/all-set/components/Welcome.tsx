import { useTranslation } from "@i18n";

export const Welcome = () => {
  const { t } = useTranslation("welcome");
  return (
    <>
      <div className="mb-8 flex items-center gap-3">
        <h1 id="page-heading" className="mb-0! text-4xl font-bold">
          {t("title")}
        </h1>
      </div>

      {/* Description */}
      <p className="mb-8">{t("description")}</p>
    </>
  );
};
