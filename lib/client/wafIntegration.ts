declare global {
  interface Window {
    AwsWafIntegration?: {
      getToken: () => Promise<string>;
      hasToken: () => boolean;
      fetch: typeof fetch;
    };
  }
}

export const isWafIntegrationEnabled = (): boolean => {
  return Boolean(process.env.NEXT_PUBLIC_WAF_INTEGRATION_URL);
};

export const getWafToken = async (): Promise<string> => {
  if (!window.AwsWafIntegration) {
    throw new Error("AWS WAF SDK not loaded");
  }

  return window.AwsWafIntegration.getToken();
};
