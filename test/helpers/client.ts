import { vi } from "vitest";

export const createTranslationStub = () => ({
  t: (key: string) => key,
  i18n: {
    language: "en",
  },
});

export const createRouterStub = () => ({
  bfcacheId: "test-bfcache-id",
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
});
