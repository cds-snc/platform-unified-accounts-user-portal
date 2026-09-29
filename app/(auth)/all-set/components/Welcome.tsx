import { I18n } from "@i18n";

export const Welcome = () => {
  return (
    <>
      <div className="mb-8 flex items-center gap-3">
        <h1 className="mb-0! text-4xl font-bold">
          <I18n i18nKey="title" namespace="welcome" />
        </h1>
      </div>

      {/* Description */}
      <p className="mb-8">
        <I18n i18nKey="description" namespace="welcome" />
      </p>
    </>
  );
};
