import { vi } from "vitest";

// Track the mock call as a Vitest function
export const mockRedirect = vi.fn();

export const redirect = (path: string) => {
  mockRedirect(path);
  // Throw a NEXT_REDIRECT error to match Next.js internal behavior
  throw new Error("NEXT_REDIRECT");
};

export const usePathname = vi.fn();
export const useRouter = vi.fn(() => ({
  push: vi.fn(),
  replace: vi.fn(),
}));
