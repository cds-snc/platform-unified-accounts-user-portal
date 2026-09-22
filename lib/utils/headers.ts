import { logMessage } from "../logger";

export function applyCustomRequestHeaders(headers: Headers, customRequestHeaders?: string) {
  customRequestHeaders?.split(",").forEach((header) => {
    const separatorIndex = header.indexOf(":");
    if (separatorIndex > 0) {
      headers.set(header.slice(0, separatorIndex).trim(), header.slice(separatorIndex + 1).trim());
    } else {
      logMessage.warn(
        `Skipping malformed CUSTOM_REQUEST_HEADERS entry (expected key:value format)`
      );
    }
  });
}
