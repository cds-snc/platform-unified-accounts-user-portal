import { AuthPanelTitle } from "@components/auth/AuthPanelTitle";
import { LeftIcon, RightIcon } from "@components/auth/AuthPanelTitleDecoration";

export const Title = () => {
  return (
    <div className="flex justify-start gap-2">
      <LeftIcon />
      <AuthPanelTitle i18nKey="title" namespace="beforeYouStart" />
      <RightIcon />
    </div>
  );
};
