import { Page } from "@playwright/test";

export type VirtualAuthenticatorCredential = {
  credentialId: string;
  isResidentCredential: boolean;
  rpId: string;
  privateKey: string;
  signCount: number;
  userHandle?: string;
};

export async function addVirtualAuthenticator(
  page: Page,
  credential?: VirtualAuthenticatorCredential
) {
  const cdpSession = await page.context().newCDPSession(page);
  await cdpSession.send("WebAuthn.enable");

  const { authenticatorId } = await cdpSession.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "usb",
      hasResidentKey: false,
      hasUserVerification: false,
      isUserVerified: false,
      automaticPresenceSimulation: true,
    },
  });

  if (credential) {
    await cdpSession.send("WebAuthn.addCredential", { authenticatorId, credential });
  }

  return { cdpSession, authenticatorId };
}
