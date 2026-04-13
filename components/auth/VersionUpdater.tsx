"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { useEffect, useRef, useState } from "react";

import { useTranslation } from "@i18n/client";
/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { Close } from "@components/icons/Close";
import { RocketIcon } from "@components/icons/RocketIcon";
import { Button } from "@components/ui/button/Button";

/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/
import { useVersionUpdater } from "./useVersionUpdater";

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

export function VersionUpdater() {
  const { t } = useTranslation("versionUpdater");
  const { didChange } = useVersionUpdater();
  const [dismissed, setDismissed] = useState(false);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const refreshButtonRef = useRef<HTMLButtonElement | null>(null);
  const showDialog = didChange && !dismissed;

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (showDialog && !dialog.open) {
      openDialog(dialog);
      refreshButtonRef.current?.focus();
    }

    if (!showDialog && dialog.open) {
      closeDialog(dialog);
    }
  }, [showDialog]);

  if (!showDialog || dismissed) {
    return null;
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="version-updater-title"
      aria-describedby="version-updater-description"
      className="fixed inset-0 m-auto w-full max-w-2xl rounded-2xl border border-gray-300 bg-white p-8 shadow-xl backdrop:bg-black/45"
      onCancel={() => {
        setDismissed(true);
      }}
      onClose={() => {
        if (!didChange) {
          setDismissed(false);
        }
      }}
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
          <p id="version-updater-description" className="text-base text-gray-700">
            {t("description")}
          </p>
        </div>

        <Button
          theme="link"
          aria-label={t("close")}
          className="group shrink-0"
          onClick={() => {
            setDismissed(true);
          }}
        >
          <span className="block">
            <Close className="inline-block size-6 fill-black group-hover:fill-gcds-blue-vivid group-focus:fill-white-default group-active:fill-white-default" />
          </span>
        </Button>
      </div>

      <div className="mt-8 flex justify-end">
        <Button
          buttonRef={(element) => {
            refreshButtonRef.current = element;
          }}
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
