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
} from "@lib/validation/validators";

const firstnameSchema = () => ({
  firstname: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "requiredFirstname"),
    v.maxLength(250, "maxLengthFirstname")
  ),
});

const lastnameSchema = () => ({
  lastname: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "requiredLastname"),
    v.maxLength(250, "maxLengthLastname")
  ),
});

const govEmailValidation = (min = 1) =>
  v.pipe(
    v.string(),
    v.toLowerCase(),
    v.trim(),
    v.minLength(min, "requiredEmail"),
    v.maxLength(254, "maxLength"),
    v.check((input) => isValidGovEmail(input), "validGovEmail")
  );

const usernameSchema = (min = 1) => ({
  username: govEmailValidation(min),
});

const emailSchema = (min = 1) => ({
  email: govEmailValidation(min),
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
});

export const confirmPasswordSchema = () => ({
  confirmPassword: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "requiredConfirmPassword"),
    v.maxLength(50, "maxLength")
  ),
});

export const codeSchema = (min = 1, max = 10) => ({
  code: v.pipe(v.string(), v.trim(), v.minLength(min, "required"), v.maxLength(max, "maxLength")),
});

const redirectURLSchema = () => ({
  redirect: v.optional(v.nullable(v.pipe(v.string(), v.trim(), v.maxLength(500, "maxLength")))),
});

const requestIdSchema = () => ({
  requestId: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(200, "maxLength"))),
});

const sessionIdSchema = () => ({
  sessionId: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "required"),
    v.maxLength(200, "maxLength")
  ),
});

const totpCodeSchema = () => ({
  code: v.pipe(v.string(), v.trim(), v.regex(/^\d{6}$/, "invalidCodeLength")),
});

const u2fIdSchema = () => ({
  u2fId: v.pipe(v.string(), v.trim(), v.minLength(1, "required"), v.maxLength(200, "maxLength")),
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
      ...passwordSchema({}),
      ...requestIdSchema(),
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

export const validatePassword = async (formEntries: { [k: string]: FormDataEntryValue }) => {
  const formValidationSchema = v.pipe(
    v.object({
      ...passwordSchema({}),
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

export const validateRequestId = (requestId: unknown) => {
  return v.safeParse(requestIdSchema().requestId, requestId, { abortPipeEarly: true });
};

export const validateSessionId = (sessionId: unknown) => {
  return v.safeParse(sessionIdSchema().sessionId, sessionId, { abortPipeEarly: true });
};

export const validateU2fId = (u2fId: unknown) => {
  return v.safeParse(u2fIdSchema().u2fId, u2fId, { abortPipeEarly: true });
};

export const validateU2FLoginCommand = (command: unknown) => {
  const schema = v.object({
    ...requestIdSchema(),
    ...redirectURLSchema(),
  });
  return v.safeParse(schema, command, { abortPipeEarly: true });
};

export const validateVerifyU2FCommand = (command: unknown) => {
  const schema = v.object({
    u2fId: u2fIdSchema().u2fId,
    passkeyName: v.optional(v.pipe(v.string(), v.maxLength(200, "maxLength"))),
    publicKeyCredential: v.object({
      id: v.pipe(v.string(), v.minLength(1, "required"), v.maxLength(1400, "maxLength")),
      rawId: v.pipe(v.string(), v.minLength(1, "required"), v.maxLength(1400, "maxLength")),
      type: v.literal("public-key"),
      response: v.object({
        attestationObject: v.pipe(
          v.string(),
          v.minLength(1, "required"),
          v.maxLength(11000, "maxLength")
        ),
        clientDataJSON: v.pipe(
          v.string(),
          v.minLength(1, "required"),
          v.maxLength(2000, "maxLength")
        ),
      }),
    }),
    sessionId: sessionIdSchema().sessionId,
  });
  return v.safeParse(schema, command, { abortPipeEarly: true });
};
