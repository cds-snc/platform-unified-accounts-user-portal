import React, { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@lib/utils";
import { useTranslation } from "@i18n/client";
import { Close } from "@components/icons/Close";
import { Button } from "@components/ui/button/Button";

interface CDSHTMLDialogElement extends HTMLDialogElement {
  addEventListener<K extends keyof HTMLElementEventMap>(
    type: K,
    listener: (this: HTMLDialogElement, ev: HTMLElementEventMap[K]) => any, // eslint-disable-line  @typescript-eslint/no-explicit-any
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void;
  removeEventListener<K extends keyof HTMLElementEventMap>(
    type: K,
    listener: (this: HTMLDialogElement, ev: HTMLElementEventMap[K]) => any, // eslint-disable-line  @typescript-eslint/no-explicit-any
    options?: boolean | EventListenerOptions
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions
  ): void;
}

export const useDialogRef = () => {
  const ref = useRef<CDSHTMLDialogElement>(null);
  return ref;
};

const randomId = () => {
  return Math.random().toString(36).slice(2, 11);
};

export const Dialog = ({
  dialogRef,
  children,
  title,
  actions,
  className,
  handleClose,
}: {
  dialogRef: React.RefObject<CDSHTMLDialogElement | null>;
  children: React.ReactElement;
  title?: string;
  actions?: React.ReactElement;
  className?: string;
  handleClose?: () => void;
}) => {
  const { t } = useTranslation("form-builder");
  const [isOpen, changeOpen] = useState(true);
  const close = useCallback(() => {
    dialogRef.current?.close();
    handleClose && handleClose();
    changeOpen(false);
  }, [dialogRef, handleClose]);

  useEffect(() => {
    const dialog = dialogRef?.current;
    if (isOpen) {
      dialog?.showModal();
    }
    return () => dialog?.close();
    // see: https://github.com/facebook/react/issues/24399
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Close modal if "ESC" key is pressed
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        handleClose && handleClose();
        close();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [close, handleClose]);

  // Avoids duplicate id for the case of more than one dialog in the DOM
  const modalRandomId = randomId();

  return (
    <dialog
      className="flex size-full items-center justify-center bg-transparent bg-clip-padding p-0 backdrop:bg-black/45"
      {...(title && { "aria-labelledby": `modal-title-${modalRandomId}` })}
      ref={dialogRef}
      data-testid="dialog"
    >
      <div
        className={cn(
          `relative max-h-[80%] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-gray-300 bg-white shadow-xl`,
          className
        )}
      >
        {title && (
          <div className="bg-white px-4 pt-4">
            <h2
              className="m-0! inline-block px-0 text-xl! font-bold"
              id={`modal-title-${modalRandomId}`}
              tabIndex={-1}
            >
              {title}
            </h2>
          </div>
        )}

        <>{children}</>
        {actions && <div className="sticky bottom-0 flex gap-2 bg-white p-4 pt-0">{actions}</div>}
        <Button
          theme="link"
          className="group absolute top-0 right-0 z-1000 mt-4 mr-4"
          aria-label={t("close")}
          onClick={close}
          dataTestId="close-dialog"
        >
          <span className="block">
            <Close className="inline-block group-focus:fill-white-default" />
          </span>
        </Button>
      </div>
    </dialog>
  );
};
