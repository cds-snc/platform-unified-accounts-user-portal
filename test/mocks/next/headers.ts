export const headers = async () => {
  return {
    get: (key: string) => {
      const mockHeaders: Record<string, string> = {
        "x-current-path": "/some/test/page",
      };
      return mockHeaders[key.toLowerCase()] || null;
    },
  };
};
