"use client";
import { checkRegistrationFlag } from "@lib/client/registration";

import { AllSet } from "./AllSet";
import { Welcome } from "./Welcome";

export const ContentHolder = () => {
  const onRegistrationPath = checkRegistrationFlag();

  // Server rendering return null
  if (onRegistrationPath === null) {
    return null;
  }

  if (onRegistrationPath) {
    return <Welcome />;
  }

  return <AllSet />;
};
