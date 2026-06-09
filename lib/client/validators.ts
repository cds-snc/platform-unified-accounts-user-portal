// DEPRECATED
export function symbolValidator(value: string): boolean {
  const REGEXP = /[^a-zA-Z0-9]/gi;
  return REGEXP.test(value);
}

// DEPRECATED
export function numberValidator(value: string): boolean {
  const REGEXP = /[0-9]/g;
  return REGEXP.test(value);
}

// DEPRECATED
export function upperCaseValidator(value: string): boolean {
  const REGEXP = /[A-Z]/g;
  return REGEXP.test(value);
}

// DEPRECATED
export function lowerCaseValidator(value: string): boolean {
  const REGEXP = /[a-z]/g;
  return REGEXP.test(value);
}

/**
 * This function checks if a given email is a government valid email.
 * And it returns true if the email is a valid GC email otherwise false.
 * @param email A valid government email
 * @returns {boolean} The validation result
 */
export const isValidGovEmail = (email: string): boolean => {
  const regex =
    /^([a-zA-Z0-9!#$%&'*+-/=?^_`{|}~.]+(\+[a-zA-Z0-9!#$%&'*+-/=?^_`{|}~.]*)?)@((?:[a-zA-Z0-9-.]+\.gc\.ca|cds-snc\.freshdesk\.com)|(canada|cds-snc|elections|rcafinnovation|canadacouncil|nfb|debates-debats|invcanada|gg)\.ca)$/;
  return regex.test(email);
};

/**
 * This function tests whether a string contains a lower case character
 * @param field A string containing a lower case character
 * @returns {boolean} The validation result
 */
export const containsLowerCaseCharacter = (field: string): boolean => {
  const reg = new RegExp("^(?=.*?[a-z])");
  if (!field || !reg.test(field)) {
    return false;
  }
  return true;
};

/**
 * This function tests whether a string contains an upper case character
 * @param field A string containing an uppwer case character
 * @returns {boolean} The validation result
 */
export const containsUpperCaseCharacter = (field: string): boolean => {
  const reg = new RegExp("^(?=.*?[A-Z])");
  if (!field || !reg.test(field)) {
    return false;
  }
  return true;
};

/**
 * This function tests whether a string contains a number
 * @param field A string containing a number
 * @returns {boolean} The validation result
 */
export const containsNumber = (field: string): boolean => {
  const reg = new RegExp("^(?=.*?[0-9])");
  if (!field || !reg.test(field)) {
    return false;
  }
  return true;
};

/**
 * This function tests whether a string contains a symbol character
 * @param field A string containing a symbol character
 * @returns {boolean} The validation result
 */
export const containsSymbol = (field: string): boolean => {
  const reg = /^(?=.*?[\^\$\*\.\[\]\{\}\(\)\?\"\!\@\#\%\&\/\\\,\>\<\'\:\;\|\_\~\`\=\+\-])/;
  if (!field || !reg.test(field)) {
    return false;
  }
  return true;
};

type ValidationError = { fieldKey: string; fieldValue: string };

/**
 * Helper to get the realted error key if one exists.
 * Requires that validationErrors has been populated with translated strings.
 * @param fieldKey - The form field key to look up
 * @param validationErrors - The array of validation errors from form state
 * @returns The error key to be used with translate, or an empty string if no error exists
 */
export const getError = (
  fieldKey: string,
  validationErrors: ValidationError[] | undefined
): string => {
  return validationErrors?.find((e) => e.fieldKey === fieldKey)?.fieldValue || "";
};

/**
 * Helter to check whether a given field key has a validation error.
 * @param fieldKey - The form field key to check
 * @param validationErrors - The array of validation errors from form state
 * @returns True if an error exists for the field, false otherwise
 */
export const hasError = (
  fieldKey: string,
  validationErrors: ValidationError[] | undefined
): boolean => {
  return Boolean(validationErrors?.find((e) => e.fieldKey === fieldKey));
};
