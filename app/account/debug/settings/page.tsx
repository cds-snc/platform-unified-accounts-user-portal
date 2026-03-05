/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { headers } from "next/headers";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getSessionCredentials } from "@lib/cookies";
import { getOriginalHostFromHeaders } from "@lib/server/host";
import { getSiteConfigFromHeaders } from "@lib/server/site-config";
import { getServiceUrlFromHeaders } from "@lib/service-url";
import { requestHost } from "@lib/site-config";
import { getBrandingSettings, getLoginSettings } from "@lib/zitadel";

const toPrettyJson = (value: unknown) => {
  return JSON.stringify(
    value,
    (_key, currentValue) =>
      typeof currentValue === "bigint" ? currentValue.toString() : currentValue,
    2
  );
};

export default async function DebugSettingsPage() {
  const _headers = await headers();
  const { serviceUrl } = getServiceUrlFromHeaders(_headers);
  const host = getOriginalHostFromHeaders(_headers);
  const siteConfig = await getSiteConfigFromHeaders();

  let organization: string | undefined;

  try {
    ({ organization } = await getSessionCredentials());
  } catch {
    // Route is under /account and should already be authenticated, but keep this resilient.
    organization = undefined;
  }

  const resolvedOrganization = organization || siteConfig.zitadelOrganizationId;

  let brandingSettings: unknown = null;
  let loginSettings: unknown = null;
  let brandingError: string | null = null;
  let loginError: string | null = null;

  try {
    brandingSettings = await getBrandingSettings({
      serviceUrl,
      organization: resolvedOrganization,
    });
  } catch (error) {
    brandingError = error instanceof Error ? error.message : String(error);
  }

  try {
    loginSettings = await getLoginSettings({
      serviceUrl,
      organization: resolvedOrganization,
    });
  } catch (error) {
    loginError = error instanceof Error ? error.message : String(error);
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-[#D1D5DB] bg-white p-6">
        <h2 className="mb-3 text-xl font-semibold">Zitadel Settings Debug</h2>
        <p className="mb-2 text-sm text-gcds-grayscale-700">
          Temporary page for inspecting live responses from `getBrandingSettings` and
          `getLoginSettings`.
        </p>
        <dl className="grid grid-cols-[12rem_1fr] gap-2 text-sm">
          <dt className="font-semibold">serviceUrl</dt>
          <dd className="break-all">{serviceUrl}</dd>
          <dt className="font-semibold">host</dt>
          <dd className="break-all">{host || "(none)"}</dd>
          <dt className="font-semibold">site id</dt>
          <dd className="break-all">{requestHost(host)}</dd>
          <dt className="font-semibold">cookie organization</dt>
          <dd className="break-all">{organization || "(none)"}</dd>
          <dt className="font-semibold">resolved organization</dt>
          <dd className="break-all">{resolvedOrganization || "(none)"}</dd>
          <dt className="font-semibold">resolved site config</dt>
          <dd>
            <pre className="overflow-x-auto rounded-lg bg-gcds-grayscale-50 p-4 text-sm">
              {toPrettyJson(siteConfig)}
            </pre>
          </dd>
        </dl>
      </section>

      <section className="rounded-2xl border border-[#D1D5DB] bg-white p-6">
        <h3 className="mb-3 text-lg font-semibold">getBrandingSettings</h3>
        {brandingError && (
          <p className="mb-3 rounded-md bg-gcds-red-50 p-3 text-sm text-gcds-red-900">
            Error: {brandingError}
          </p>
        )}
        <pre className="overflow-x-auto rounded-lg bg-gcds-grayscale-50 p-4 text-sm">
          {toPrettyJson(brandingSettings)}
        </pre>
      </section>

      <section className="rounded-2xl border border-[#D1D5DB] bg-white p-6">
        <h3 className="mb-3 text-lg font-semibold">getLoginSettings</h3>
        {loginError && (
          <p className="mb-3 rounded-md bg-gcds-red-50 p-3 text-sm text-gcds-red-900">
            Error: {loginError}
          </p>
        )}
        <pre className="overflow-x-auto rounded-lg bg-gcds-grayscale-50 p-4 text-sm">
          {toPrettyJson(loginSettings)}
        </pre>
      </section>
    </div>
  );
}
