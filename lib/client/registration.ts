const sessionStorageKey = "registration";

export const setRegistrationFlag = () => {
  sessionStorage.setItem(sessionStorageKey, "true");
};

export const removeRegistrationFlag = () => {
  sessionStorage.removeItem(sessionStorageKey);
};

export const checkRegistrationFlag = () => {
  if (typeof window === "undefined") {
    return null;
  }
  return Boolean(sessionStorage.getItem(sessionStorageKey));
};
