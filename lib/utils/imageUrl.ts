/**
 * Constructs an image URL with the base path prepended
 * Respects the NEXT_PUBLIC_BASE_PATH environment variable
 */
export function getImageUrl(path: string): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  // Ensure path starts with /
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${basePath}${cleanPath}`;
}
