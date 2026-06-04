/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { UserFactor } from "@zitadel/proto/zitadel/session/v2/session_pb";

import { logMessage } from "@lib/logger";
import { loadActiveSession, SessionWithAuthData } from "@lib/session";

type SessionCredentials = SessionWithAuthData & {
  factors: {
    user: UserFactor;
  };
};

/**
 * Higher-order function that wraps server actions with authentication.
 * Validates user session before executing the action.
 *
 * Pattern adopted from platform-forms-client for secure server action handling.
 *
 * @param action - Server action function that receives SessionCredentials as first parameter
 * @returns Wrapped function that performs auth check before executing action
 *
 * @example
 * ```typescript
 * export const updateUserProfile = AuthenticatedAction(
 *   async (credentials, userId: string, data: UpdateData) => {
 *     // Check user can access userId
 *     if (credentials.userId !== userId) {
 *       return { error: "Unauthorized" };
 *     }
 *     // Safe to proceed with authenticated context
 *     return updateHuman({ serviceUrl, request: {...} });
 *   }
 * );
 * ```
 *
 * @security Always validates session credentials before passing to inner action.
 * Returns error object instead of throwing to allow client-side error handling.
 */
export const AuthenticatedAction = <Input extends unknown[], Return>(
  action: (credentials: SessionCredentials, ...args: Input) => Promise<Return>
): ((...args: Input) => Promise<Return>) => {
  return async (...args: Input): Promise<Return> => {
    const session = await loadActiveSession();
    if (!session.factors?.user) {
      throw new Error("User does not exist on session");
    }
    return action(session as SessionCredentials, ...args).then((error) => {
      if (isRedirectError(error)) {
        throw error;
      }
      logMessage.error(`AuthenticatedAction failure in ${action.name || "unknown"}`, error);
      throw new Error("Unauthorized");
    });
  };
};
