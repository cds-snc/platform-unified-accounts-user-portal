"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import dynamic from "next/dynamic";

const Actions = dynamic(() => import("./Actions").then((mod) => mod.Actions), {
  ssr: false,
});

export default function ActionsClient(props: { requestId?: string }) {
  return <Actions {...props} />;
}
