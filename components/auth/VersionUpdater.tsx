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

function VersionUpdaterDialog({
  didChange,
  latestShortVersion,
  previousShortVersion,
  onDismiss,
}: {
  didChange: boolean;
  latestShortVersion: string | null;
  previousShortVersion: string | null;
  onDismiss: () => void;
}) {
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
      onCancel={onDismiss}
      onClose={() => {
        if (!didChange) {
          return;
        }

        onDismiss();
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

          <p id="version-updater-description" className="max-w-xl text-base text-gray-700">
            {t("description")}
          </p>
        </div>

        <Button theme="link" aria-label={t("close")} className="group shrink-0" onClick={onDismiss}>
          <span className="block">
            <Close className="inline-block size-6 fill-black group-hover:fill-gcds-blue-vivid group-focus:fill-white-default group-active:fill-white-default" />
          </span>
        </Button>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <div className="text-xs text-gray-500" data-testid="version-updater-debug">
          {latestShortVersion ?? "unknown"}:{previousShortVersion ?? "unknown"}
        </div>

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
  const { didChange, latestVersion, latestShortVersion, previousShortVersion } =
    useVersionUpdater();
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null);
  const showDialog = didChange && latestVersion !== null && latestVersion !== dismissedVersion;

  return showDialog ? (
    <VersionUpdaterDialog
      didChange={didChange}
      latestShortVersion={latestShortVersion}
      previousShortVersion={previousShortVersion}
      onDismiss={() => {
        setDismissedVersion(latestVersion);
      }}
    />
  ) : null;
}
