/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getSessionCredentials } from "@lib/cookies";
import { logMessage } from "@lib/logger";
/**
 * Session credentials extracted from HTTP-only cookies.
 * Available after user authentication.
 */
export type SessionCredentials = {
  sessionId: string;
  loginName: string;
  userId: string;
  organization?: string;
  requestId?: string;
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
): ((...args: Input) => Promise<Return | { error: string }>) => {
  return async (...args: Input): Promise<Return | { error: string }> => {
    try {
      const credentials = await getSessionCredentials();
      return await action(credentials, ...args);
    } catch (error) {
      logMessage.error(`AuthenticatedAction failure in ${action.name || "unknown"}`, error);
      return { error: "Unauthorized" };
    }
  };
};
