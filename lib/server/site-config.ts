/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { headers } from "next/headers";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getOriginalHostFromHeaders } from "@lib/server/host";
import { resolveSiteConfigByHost } from "@lib/site-config";

export async function getSiteConfigFromHeaders() {
  const _headers = await headers();
  const host = getOriginalHostFromHeaders(_headers);

  return resolveSiteConfigByHost(host);
}
