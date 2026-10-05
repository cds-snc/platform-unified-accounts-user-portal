"use client";
import { createContext, useContext, useEffect, useState } from "react";

import ErrorComponent from "@root/app/error";
import { logMessage } from "@lib/logger";
import { VersionUpdater } from "@components/layout/VersionUpdater";

type AppStatusContextValue = {
  updateTriggered: boolean;
  updateRequired: boolean;
  serviceError: boolean;
};

const AppStatusContext = createContext<AppStatusContextValue | undefined>(undefined);

export const AppStatusProvider = ({ children }: { children: React.ReactNode }) => {
  const [updateRequired, setUpdateRequired] = useState(false);
  const [serviceError, setServiceError] = useState(false);

  const updateTriggered =
    typeof window !== "undefined" ? Boolean(sessionStorage?.getItem("ssoUpdate")) : false;

  if (updateTriggered) {
    logMessage.debug("useAppStatus flagging update was triggered");
  }

  const handleMessage = (event: MessageEvent) => {
    logMessage.info("Message Recieved");
    switch (event.data.type) {
      case "SSO_UPDATE": {
        sessionStorage.setItem("ssoUpdate", "inProgress");
        setUpdateRequired(true);
        break;
      }
      case "SSO_ERROR": {
        setServiceError(true);
        break;
      }
    }
  };

  // Register listeners on component load
  useEffect(() => {
    navigator.serviceWorker.addEventListener("message", handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, []);

  // After an update clean up and remove the update flag from session storage
  useEffect(() => {
    sessionStorage.removeItem("ssoUpdate");
  }, []);

  return (
    <AppStatusContext.Provider
      value={{
        updateRequired,
        updateTriggered,
        serviceError,
      }}
    >
      {updateRequired && <VersionUpdater />}
      {serviceError ? (
        <ErrorComponent error={{ name: "Service Error", message: "Service Error" }} />
      ) : (
        children
      )}
    </AppStatusContext.Provider>
  );
};

export const useAppStatus = () => {
  const context = useContext(AppStatusContext);
  if (context === undefined) {
    throw new Error("useAppStatus must be used within the AppStatusProvider");
  }
  return context;
};
