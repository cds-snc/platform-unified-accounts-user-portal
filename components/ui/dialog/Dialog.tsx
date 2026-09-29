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
      className="size-full bg-transparent bg-clip-padding p-0"
      {...(title && { "aria-labelledby": `modal-title-${modalRandomId}` })}
      ref={dialogRef}
      data-testid="dialog"
    >
      <div
        className={cn(
          `relative mt-6 max-h-[80%] max-w-[700px] overflow-y-auto rounded-xl border-1 border-slate-500 bg-white tablet:mx-auto tablet:mt-8 laptop:mt-24`,
          className
        )}
      >
        {title && (
          <div className="border-b-[0.5px] border-slate-500 bg-slate-50">
            <h2
              className="mt-4! mb-4! ml-2! inline-block px-4 text-2xl!"
              id={`modal-title-${modalRandomId}`}
              tabIndex={-1}
            >
              {title}
            </h2>
          </div>
        )}

        <>{children}</>
        {actions && (
          <div className="sticky bottom-0 flex border-t-[0.5px] border-slate-500 bg-white p-4">
            {actions}
          </div>
        )}
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
