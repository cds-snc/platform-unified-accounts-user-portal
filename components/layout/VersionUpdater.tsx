"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { useEffect, useRef } from "react";

import { useAppStatus } from "@lib/client/useAppStatus";
import { useTranslation } from "@i18n/client";
/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { RocketIcon } from "@components/icons/RocketIcon";
import { Button } from "@components/ui/button/Button";

/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/

function openDialog(dialog: HTMLDialogElement) {
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
    return;
  }

  dialog.setAttribute("open", "");
}

function closeDialog(dialog: HTMLDialogElement) {
  if (typeof dialog.close === "function") {
    dialog.close();
    return;
  }

  dialog.removeAttribute("open");
}

function VersionUpdaterDialog() {
  const { t } = useTranslation("versionUpdater");
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const refreshButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (!dialog.open) {
      openDialog(dialog);
      refreshButtonRef.current?.focus();
    }

    return () => {
      if (dialog.open) {
        closeDialog(dialog);
      }
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="version-updater-title"
      aria-describedby="version-updater-description"
      className="fixed inset-0 m-auto w-full max-w-2xl rounded-2xl border border-gray-300 bg-white p-8 shadow-xl backdrop:bg-black/45"
      onCancel={(e) => e.preventDefault()}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="-mt-3 flex size-8 shrink-0 items-center justify-center">
              <RocketIcon className="size-12" />
            </div>
            <h2 id="version-updater-title" className="text-2xl font-bold text-black">
              {t("title")}
            </h2>
          </div>

          <p id="version-updater-description" className="max-w-xl text-base text-gray-700">
            {t("description")}
          </p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <Button
          buttonRef={refreshButtonRef}
          onClick={() => {
            window.location.reload();
          }}
        >
          {t("refreshNow")}
        </Button>
      </div>
    </dialog>
  );
}

export function VersionUpdater() {
  const { updateRequired } = useAppStatus();

  return updateRequired ? <VersionUpdaterDialog /> : null;
}
