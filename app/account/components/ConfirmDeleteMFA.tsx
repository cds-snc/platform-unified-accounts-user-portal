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
        theme="primary"
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
          <p className="mb-6">{t("mfaAuthentication.confirmRemove.message")}</p>
          {mfaName === "totp" ? (
            <p className="font-bold">{t("mfaAuthentication.authenticatorApp")}</p>
          ) : (
            <p>
              <span className="font-bold">{t("mfaAuthentication.securityKey")}</span>
              <span className="px-2">{mfaName}</span>
            </p>
          )}
        </div>
      </div>
    </Dialog>
  );
};
