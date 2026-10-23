type GetSafeErrorMessageParams = {
  error?: string;
  fallback: string;
  allowedMessages?: string[];
};

export const getSafeErrorMessage = ({
  error,
  fallback,
  allowedMessages = [],
}: GetSafeErrorMessageParams): string => {
  const normalizedError = error?.trim();

  if (!normalizedError) {
    return fallback;
  }

  return allowedMessages.includes(normalizedError) ? normalizedError : fallback;
};

type GetSafeErrorMessageFromKeyParams = {
  errorKey?: string;
  fallbackKey: string;
  allowedErrorKeys: string[];
  t: (key: string) => string;
};

/**
 * Translates an error key returned from a server action, but only if it is in the allow list.
 * Anything else resolves to the translated fallback key.
 */
export const getSafeErrorMessageFromKey = ({
  errorKey,
  fallbackKey,
  allowedErrorKeys,
  t,
}: GetSafeErrorMessageFromKeyParams): string =>
  t(errorKey && allowedErrorKeys.includes(errorKey) ? errorKey : fallbackKey);
