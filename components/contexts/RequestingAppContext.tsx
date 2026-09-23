"use client";

import React, { createContext, ReactNode, useContext } from "react";

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
    throw new Error("useRequestingApp must be used within a RequestingAppProvider");
  }
  return context;
};
