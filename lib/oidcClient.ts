import { toAuthRequestId } from "@lib/oidc-request-id";
import { getApplications, getAuthRequest } from "@lib/zitadel";

import { logMessage } from "./logger";

import "server-only";

const ClientName = {
  GCForms: "GC Forms",
  Notify: "GC Notify",
} as const;

class OidcClientList {
  public list: Map<
    string,
    { name: string; clientId: string; projectId: string; projectName: string }
  >;

  constructor() {
    this.list = new Map();
  }

  async initialize() {
    const apps = await getApplications().catch((e) => {
      logMessage.error("Could not retrieve applications from Zitadel projects");
      logMessage.error(e);
      return undefined;
    });

    if (apps) {
      this.list = new Map(
        apps.flatMap((app) => {
          return [[app.clientId, app]];
        })
      );
    }
  }
}

const oidcClientList = new OidcClientList();
await oidcClientList.initialize();

const getApplicationByClientId = async (clientId: string) => {
  // Check to see if we need to populate the list again if there
  // was an error on application startup
  if (oidcClientList.list.size < 1) {
    await oidcClientList.initialize();
  }

  const project = oidcClientList.list.get(clientId)?.projectName;
  if (project && (Object.values(ClientName) as string[]).includes(project)) {
    return project;
  }
  return undefined;
};

export async function getCallingApp(requestId: string) {
  const authRequestId = toAuthRequestId(requestId);
  const { authRequest } = await getAuthRequest({ authRequestId });
  if (authRequest) {
    return getApplicationByClientId(authRequest?.clientId);
  }
}
