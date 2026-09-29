"use client";
import { useSyncExternalStore } from "react";

import { checkRegistrationFlag } from "@lib/client/registration";

import { AllSet } from "./AllSet";
import { Welcome } from "./Welcome";

export const ContentHolder = () => {
  const registrationFlag = useSyncExternalStore(
    () => () => {},
    checkRegistrationFlag,
    () => null
  );

  // Server rendering return null
  if (registrationFlag === null) {
    return null;
  }

  if (registrationFlag) {
    return <Welcome />;
  }

  return <AllSet />;
};
