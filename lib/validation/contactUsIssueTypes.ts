export const CONTACT_US_ISSUE_TYPES = [
  "password-reset",
  "mfa-issue",
  "sign-up-issue",
  "other",
] as const;

export type ContactUsIssueType = (typeof CONTACT_US_ISSUE_TYPES)[number];
