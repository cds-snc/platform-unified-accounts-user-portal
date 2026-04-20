"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { useEffect, useState } from "react";
import copy from "copy-to-clipboard";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { CheckIcon } from "@components/icons/CheckIcon";
import { CopyIcon } from "@components/icons/CopyIcon";
type Props = {
  value: string;
};

export function CopyToClipboard({ value }: Props) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const to = setTimeout(setCopied, 1000, false);
    return () => clearTimeout(to);
  }, [copied]);

  return (
    <div className="flex flex-row items-center px-2">
      <button
        id="tooltip-ctc"
        type="button"
        onClick={() => {
          copy(value);
          setCopied(true);
        }}
      >
        {!copied ? <CopyIcon className="size-5" /> : <CheckIcon className="size-5" />}
      </button>
    </div>
  );
}
