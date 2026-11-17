import { test as base } from "@playwright/test";

import { deleteUserByEmail } from "./zitadel";

type UserCleanup = (email: string, accessToken: string, idpUrl: string) => void;

export const test = base.extend<object, { trackUserForCleanup: UserCleanup }>({
  trackUserForCleanup: [
    async ({}, use) => {
      const users = new Map<string, () => Promise<void>>();
      await use((email, accessToken, idpUrl) => {
        users.set(email, () => deleteUserByEmail(email, accessToken, idpUrl));
      });

      const results = await Promise.allSettled([...users.values()].map((cleanup) => cleanup()));
      const errors = results
        .filter((result) => result.status === "rejected")
        .map((result) => result.reason);
      if (errors.length) {
        throw new AggregateError(errors, "Failed to clean up integration test users");
      }
    },
    { scope: "worker", timeout: 60000 },
  ],
});
