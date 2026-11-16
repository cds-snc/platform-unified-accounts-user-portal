"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { createContext, ReactNode, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "registration-data";

type RegistrationData = {
  firstname: string;
  lastname: string;
  email: string;
  requestId?: string;
  inviteCode?: string;
  acceptedTerms?: boolean;
};

type RegistrationContextType = {
  registrationData: RegistrationData | null;
  setRegistrationData: (data: RegistrationData) => void;
  setAcceptedTerms: (val: boolean) => void;
  isHydrated: boolean;
};

const RegistrationContext = createContext<RegistrationContextType | null>(null);

// Read from sessionStorage (only works on client)
function readFromStorage(): RegistrationData | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as RegistrationData;
    }
  } catch {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
  return null;
}

export function RegistrationProvider({
  children,
  acceptTerms,
}: {
  children: ReactNode;
  acceptTerms: ReactNode;
}) {
  // Lazy initializer - reads from storage on first client render
  const [registrationData, setRegistrationDataState] = useState<RegistrationData | null>(
    readFromStorage
  );

  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // In client components, `typeof window !== "undefined"` is true after hydration
  // Note: This will be false during SSR but true on client
  const isHydrated = typeof window !== "undefined";

  const setRegistrationData = (data: RegistrationData) => {
    setRegistrationDataState({ ...data, acceptedTerms });
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, acceptedTerms }));
    } catch {
      // sessionStorage may not be available
    }
  };

  // Clean up data in storage when Registration Provider unmounts
  useEffect(() => {
    return () => {
      sessionStorage.removeItem(STORAGE_KEY);
    };
  }, []);

  return (
    <RegistrationContext.Provider
      value={{
        registrationData,
        setRegistrationData,
        setAcceptedTerms,
        isHydrated,
      }}
    >
      {acceptedTerms ? children : acceptTerms}
    </RegistrationContext.Provider>
  );
}

export function useRegistration() {
  const context = useContext(RegistrationContext);
  if (!context) {
    throw new Error("useRegistration must be used within a RegistrationProvider");
  }
  return context;
}
