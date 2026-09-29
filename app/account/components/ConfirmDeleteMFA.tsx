import { useTranslation } from "@i18n/client";
import { Button } from "@components/ui/button/Button";
import { Dialog, useDialogRef } from "@components/ui/dialog/Dialog";

export const ConfirmDeleteMFADialog = ({
  mfaName,
  handleConfirm,
  handleClose,
}: {
  mfaName: string;
  handleConfirm: () => void;
  handleClose: () => void;
}) => {
  const dialog = useDialogRef();
  const { t } = useTranslation("account");

  const actions = (
    <>
      <Button theme="secondary" onClick={() => handleClose()} dataTestId="cancel-delete">
        {t("mfaAuthentication.confirmRemove.cancel")}
      </Button>
      <Button
        className="ml-5"
        theme="destructive"
        onClick={() => {
          dialog.current?.close();
          handleClose();
          handleConfirm();
        }}
        dataTestId="confirm-delete"
      >
        {t("mfaAuthentication.confirmRemove.confirm")}
      </Button>
    </>
  );

  return (
    <Dialog
      handleClose={handleClose}
      dialogRef={dialog}
      actions={actions}
      title={t("mfaAuthentication.confirmRemove.title")}
    >
      <div className="p-5">
        <div>
          <p className="mb-6">
            {t("mfaAuthentication.confirmRemove.message", {
              mfa: mfaName === "totp" ? t("mfaAuthentication.authenticatorApp") : mfaName,
            })}
          </p>
        </div>
      </div>
    </Dialog>
  );
};
