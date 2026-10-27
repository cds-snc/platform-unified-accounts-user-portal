"use client";

import React, { createContext, ReactNode, useContext } from "react";

import { logMessage } from "@lib/logger";
import { useTranslation } from "@i18n";
type RequestingAppContextType = {
  requestingAppName?: string;
};

const RequestingAppContext = createContext<RequestingAppContextType | undefined>(undefined);

type RequestingAppProviderProps = {
  children: ReactNode;
  appName?: string;
};

export const RequestingAppProvider: React.FC<RequestingAppProviderProps> = ({
  children,
  appName,
}) => {
  const { t } = useTranslation("rpApps");

  function getAppName() {
    if (appName) {
      return t(appName) ?? t("defaultAppName");
    }
    return t("defaultAppName");
  }

  return (
    <RequestingAppContext.Provider value={{ requestingAppName: getAppName() }}>
      {children}
    </RequestingAppContext.Provider>
  );
};
export const useRequestingApp = (): RequestingAppContextType => {
  const context = useContext(RequestingAppContext);
  if (context === undefined) {
    logMessage.debug(
      "useRequestingApp must be used within a RequestingAppProvider - using default context value"
    );
    return { requestingAppName: undefined };
  }
  return context;
};
