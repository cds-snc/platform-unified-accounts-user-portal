"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { useEffect, useEffectEvent, useState } from "react";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getShortVersion } from "@lib/version";

/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/
import { useLeaderTab } from "./useLeaderTab";

type VersionUpdateState = {
  latestVersion: string | null;
  previousVersion: string | null;
  latestShortVersion: string | null;
  previousShortVersion: string | null;
  didChange: boolean;
};

let currentVersion: string | null = null;

const POLL_INTERVAL_MS =
  Number(process.env.NEXT_PUBLIC_VERSION_POLL_INTERVAL_SECONDS || "60") * 1000;

export function useVersionUpdater(): VersionUpdateState {
  const { isLeaderTab } = useLeaderTab({
    enabled: true,
    coordinationKey: "version-updater",
  });
  const [state, setState] = useState<VersionUpdateState>({
    latestVersion: null,
    previousVersion: null,
    latestShortVersion: null,
    previousShortVersion: null,
    didChange: false,
  });

  const checkVersion = useEffectEvent(async () => {
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const response = await fetch(`${basePath}/version`, {
        cache: "no-store",
        redirect: "manual",
      });

      const contentType = response.headers.get("content-type") || "";

      if (!response.ok || !contentType.startsWith("text/plain")) {
        setState((previousState) => ({
          ...previousState,
          didChange: false,
        }));
        return;
      }

      const latestVersion = (await response.text()).trim();

      if (!latestVersion) {
        setState((previousState) => ({
          ...previousState,
          didChange: false,
        }));
        return;
      }

      const previousVersion = currentVersion;
      currentVersion = latestVersion;
      const latestShortVersion = getShortVersion(latestVersion);
      const previousShortVersion = previousVersion ? getShortVersion(previousVersion) : null;

      const didChange = previousVersion !== null && latestVersion !== previousVersion;

      setState({
        latestVersion,
        previousVersion,
        latestShortVersion,
        previousShortVersion,
        didChange,
      });
    } catch {
      setState((previousState) => ({
        ...previousState,
        didChange: false,
      }));
    }
  });

  useEffect(() => {
    if (!isLeaderTab) {
      return;
    }

    void checkVersion();

    const intervalId = window.setInterval(() => {
      void checkVersion();
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isLeaderTab]);

  return state;
}
