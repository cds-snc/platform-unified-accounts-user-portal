/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import * as v from "valibot";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import {
  containsLowerCaseCharacter,
  containsNumber,
  containsSymbol,
  containsUpperCaseCharacter,
  isValidGovEmail,
} from "@lib/client/validators";

const firstnameSchema = () => ({
  firstname: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "requiredFirstname")
    // TODO what about adding these "just encase" checks to all text fields?
    // v.maxLength(500, errorMessages["signUpRegistration.fields.name.error.maxLength"])
    // v.regex(/^[a-zA-Z\s'-]+$/, "First name can only contain letters, spaces, hyphens, and apostrophes")
  ),
});

const lastnameSchema = () => ({
  lastname: v.pipe(v.string(), v.trim(), v.minLength(1, "requiredLastname")),
});

const emailSchema = () => ({
  email: v.pipe(
    v.string(),
    v.toLowerCase(),
    v.trim(),
    v.minLength(1, "requiredEmail"),
    v.check((input) => isValidGovEmail(input), "validGovEmail")
  ),
});

// TODO: is username always an email? If so, replace above with username
const usernameSchema = (min = 1) => ({
  // username: v.pipe(v.string(), v.trim(), v.minLength(min, "requiredUsername")),
  username: v.pipe(
    v.string(),
    v.toLowerCase(),
    v.trim(),
    v.minLength(min, "requiredUsername"),
    v.check((input) => isValidGovEmail(input), "validGovEmail")
  ),
});

// Password restrictions from Zitadel password settings
export const passwordSchema = ({
  minLength,
  requiresLowercase,
  requiresNumber,
  requiresSymbol,
  requiresUppercase,
}: {
  minLength?: number;
  requiresLowercase?: boolean;
  requiresNumber?: boolean;
  requiresSymbol?: boolean;
  requiresUppercase?: boolean;
}) => ({
  ...{
    password: v.pipe(
      v.string(),
      v.trim(),
      v.minLength(1, "requiredPassword"),
      v.check((password) => !minLength || password.length >= minLength, "minLength"),
      v.maxLength(50, "maxLength"),
      v.check(
        (password) => !requiresLowercase || containsLowerCaseCharacter(password),
        "hasLowercase"
      ),
      v.check(
        (password) => !requiresUppercase || containsUpperCaseCharacter(password),
        "hasUppercase"
      ),
      v.check((password) => !requiresNumber || containsNumber(password), "hasNumber"),
      v.check((password) => !requiresSymbol || containsSymbol(password), "hasSymbol")
    ),
  },
});

export const confirmPasswordSchema = () => ({
  ...{
    confirmPassword: v.pipe(v.string(), v.trim(), v.minLength(1, "requiredConfirmPassword")),
  },
});

export const codeSchema = (min = 1, max = 10) => ({
  ...{
    code: v.pipe(v.string(), v.trim(), v.minLength(min, "required"), v.maxLength(max, "maxLength")),
  },
});

const totpCodeSchema = () => ({
  ...{
    code: v.pipe(v.string(), v.trim(), v.regex(/^\d{6}$/, "invalidCodeLength")),
  },
});

// Shared "composed" validation functions using the above schemas

export const validateAccount = async (formEntries: { [k: string]: FormDataEntryValue }) => {
  const formValidationSchema = v.pipe(
    v.object({
      ...firstnameSchema(),
      ...lastnameSchema(),
      ...emailSchema(),
    })
  );
  return v.safeParse(formValidationSchema, formEntries, { abortPipeEarly: true });
};

export const validateAccountWithPassword = async (formEntries: {
  [k: string]: FormDataEntryValue;
}) => {
  const formValidationSchema = v.pipe(
    v.object({
      ...firstnameSchema(),
      ...lastnameSchema(),
      ...emailSchema(),
      ...passwordSchema({}),
    })
  );
  return v.safeParse(formValidationSchema, formEntries, { abortPipeEarly: true });
};

export const validateUsername = async (formEntries: { [k: string]: FormDataEntryValue }) => {
  const formValidationSchema = v.pipe(
    v.object({
      ...usernameSchema(),
    })
  );
  return v.safeParse(formValidationSchema, formEntries, { abortPipeEarly: true });
};

export const validateUsernameAndPassword = async (formEntries: {
  [k: string]: FormDataEntryValue;
}) => {
  const formValidationSchema = v.pipe(
    v.object({
      ...usernameSchema(),
      password: v.pipe(v.string(), v.nonEmpty("requiredPassword")),
    })
  );
  return v.safeParse(formValidationSchema, formEntries, { abortPipeEarly: true });
};

export const validateCode = async (
  formEntries: { [k: string]: FormDataEntryValue },
  min = 1,
  max = 10
) => {
  const formValidationSchema = v.pipe(
    v.object({
      ...codeSchema(min, max),
    })
  );
  return v.safeParse(formValidationSchema, formEntries, { abortPipeEarly: true });
};

export const validateTotpCode = async (formEntries: { [k: string]: FormDataEntryValue }) => {
  const formValidationSchema = v.pipe(
    v.object({
      ...totpCodeSchema(),
    })
  );
  return v.safeParse(formValidationSchema, formEntries, { abortPipeEarly: true });
};

export const validatePersonalDetails = async (formEntries: { [k: string]: FormDataEntryValue }) => {
  const formValidationSchema = v.pipe(
    v.object({
      ...firstnameSchema(),
      ...lastnameSchema(),
    })
  );
  return v.safeParse(formValidationSchema, formEntries, { abortPipeEarly: true });
};
