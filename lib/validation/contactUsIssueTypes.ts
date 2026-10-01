export const CONTACT_US_ISSUE_TYPES = [
  "password-reset",
  "mfa-issue",
  "sign-up-issue",
  "other",
] as const;

export type ContactUsIssueType = (typeof CONTACT_US_ISSUE_TYPES)[number];

export const ISSUE_TYPE_I18N_KEYS: Record<ContactUsIssueType, string> = {
  "password-reset": "issueTypeOptions.passwordReset",
  "mfa-issue": "issueTypeOptions.mfaIssue",
  "sign-up-issue": "issueTypeOptions.signUpIssue",
  other: "issueTypeOptions.other",
};
