export function getVersion(): string {
  return process.env.GIT_SHA ?? new Date().toISOString();
}

export function getShortVersion(version: string): string {
  return /^[0-9a-f]{7,64}$/i.test(version) ? version.substring(0, 7) : version;
}
