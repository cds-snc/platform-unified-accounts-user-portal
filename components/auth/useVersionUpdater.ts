"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { useEffect, useEffectEvent, useState } from "react";

type VersionUpdateState = {
  latestVersion: string | null;
  previousVersion: string | null;
  didChange: boolean;
};

let currentVersion: string | null = null;

const POLL_INTERVAL_MS =
  Number(process.env.NEXT_PUBLIC_VERSION_POLL_INTERVAL_SECONDS || "60") * 1000;

export function useVersionUpdater(): VersionUpdateState {
  const [state, setState] = useState<VersionUpdateState>({
    latestVersion: null,
    previousVersion: null,
    didChange: false,
  });

  const checkVersion = useEffectEvent(async () => {
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const response = await fetch(`${basePath}/version`, {
        cache: "no-store",
      });

      if (!response.ok) {
        setState((previousState) => ({
          ...previousState,
          didChange: false,
        }));
        return;
      }

      const latestVersion = await response.text();
      const previousVersion = currentVersion;
      currentVersion = latestVersion;

      const didChange = previousVersion !== null && latestVersion !== previousVersion;

      setState({
        latestVersion,
        previousVersion,
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
    void checkVersion();

    const intervalId = window.setInterval(() => {
      void checkVersion();
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  return state;
}
