type GCNotifyTemplate = {
  subject: string;
  formResponse: string;
};

export const getPasswordResetTemplate = (resetCode: string): GCNotifyTemplate => ({
  subject: "Reset your password | Réinitialiser votre mot de passe",
  formResponse: `
**Reset your password | Réinitialiser votre mot de passe**

Use the following code to reset your password. | Utilisez le code suivant pour réinitialiser votre mot de passe.

${resetCode}`,
});

export const getSecurityCodeTemplate = (code: string): GCNotifyTemplate => ({
  subject: "Your security code | Votre code de sécurité",
  formResponse: `
**Your security code | Votre code de sécurité**


${code}`,
});

export const getAccountRestrictedTemplate = (contactUsUrl: string): GCNotifyTemplate => ({
  subject: "Account access issue | Problème d'accès au compte",
  formResponse: `
**Account access issue | Problème d'accès au compte**

Someone tried to sign in to your account, but your account is currently locked or disabled. Please [contact us](${contactUsUrl}) for help.

---

Quelqu'un a tenté de se connecter à votre compte, mais celui-ci est actuellement verrouillé ou désactivé. Veuillez [nous contacter](${contactUsUrl}) pour obtenir de l'aide.`,
});

export const getPasswordChangedTemplate = (contactUsUrl: string): GCNotifyTemplate => ({
  subject: "Password changed | Mot de passe modifié",
  formResponse: `
**Password changed | Mot de passe modifié**

Your password has been successfully changed. If you did not make this change, please [contact support](${contactUsUrl}) immediately.

---

Votre mot de passe a été modifié avec succès. Si vous n'avez pas effectué ce changement, veuillez [contacter le support](${contactUsUrl}) immédiatement.`,
});
