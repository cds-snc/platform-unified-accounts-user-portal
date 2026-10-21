"use client";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { DocumentShell } from "@components/layout/DocumentShell";
import { GenericError } from "@components/ui/error/GenericError";

export default function GlobalError() {
  return (
    <DocumentShell>
      <main className="pt-24">
        <GenericError errorCode="ROOT_LAYOUT_ERROR" />
      </main>
    </DocumentShell>
  );
}
