"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { useEffect, useRef, useState } from "react";
import { JsonObject } from "@zitadel/client";
import { Checks } from "@zitadel/proto/zitadel/session/v2/session_service_pb";

import { updateSessionForU2FChallenge, verifyU2FLogin } from "@root/app/(auth)/u2f/actions";
/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { coerceToArrayBuffer, coerceToBase64Url } from "@lib/utils/base64";
import { useTranslation } from "@i18n";
import { Alert, ErrorStatus } from "@components/ui/form";

type PublicKeyCredentialRequestOptionsData = {
  challenge: BufferSource | string;
  timeout?: number;
  rpId?: string;
  allowCredentials?: PublicKeyCredentialDescriptor[];
  userVerification?: "required" | "preferred" | "discouraged";
  [key: string]: unknown;
};

type Props = {
  requestId?: string;
  redirect?: string | null;
};

async function getCredentialAssertionData(
  publicKey: PublicKeyCredentialRequestOptionsData
): Promise<JsonObject | null> {
  const normalizedPublicKey: PublicKeyCredentialRequestOptionsData = {
    ...publicKey,
    challenge: coerceToArrayBuffer(publicKey.challenge, "publicKey.challenge"),
    allowCredentials: publicKey.allowCredentials?.map(
      (listItem: PublicKeyCredentialDescriptor) => ({
        ...listItem,
        id: coerceToArrayBuffer(listItem.id, "publicKey.allowCredentials.id"),
        transports: ["usb", "ble", "nfc"] as AuthenticatorTransport[],
      })
    ),
  };

  const credential = (await navigator.credentials.get({
    publicKey: normalizedPublicKey,
  } as CredentialRequestOptions)) as Credential | null;

  if (!credential) {
    return null;
  }

  const assertedCredential = credential as PublicKeyCredential;
  const assertionResponse = assertedCredential.response as AuthenticatorAssertionResponse;
  const authData = new Uint8Array(assertionResponse.authenticatorData);
  const clientDataJSON = new Uint8Array(assertionResponse.clientDataJSON);
  const rawId = new Uint8Array(assertedCredential.rawId);
  const sig = new Uint8Array(assertionResponse.signature);
  const userHandle = new Uint8Array(assertionResponse.userHandle || []);

  return {
    id: assertedCredential.id,
    rawId: coerceToBase64Url(rawId, "rawId"),
    type: assertedCredential.type,
    response: {
      authenticatorData: coerceToBase64Url(authData, "authData"),
      clientDataJSON: coerceToBase64Url(clientDataJSON, "clientDataJSON"),
      signature: coerceToBase64Url(sig, "sig"),
      userHandle: coerceToBase64Url(userHandle, "userHandle"),
    },
  } as JsonObject;
}

export function LoginU2F({ requestId, redirect }: Props) {
  const [error, setError] = useState<string>("");

  const { t } = useTranslation("u2f");

  const initialized = useRef(false);

  async function startU2FLoginFlow() {
    const publicKeyCredential = await updateSessionForU2FChallenge(requestId)
      // Type guard to ensure the data is not undefined
      .then(({ challenges }) => {
        if (typeof challenges?.webAuthN?.publicKeyCredentialRequestOptions === "undefined") {
          throw new Error("U2F Challenges could not be initiated");
        }
        return challenges.webAuthN.publicKeyCredentialRequestOptions;
      })
      .catch(() => {
        setError(t("verify.errors.verificationFailed"));
        throw new Error("U2F Challenges could not be initiated");
      });

    const data = await getCredentialAssertionData(
      publicKeyCredential.publicKey as PublicKeyCredentialRequestOptionsData
    );

    if (!data) {
      setError(t("verify.errors.couldNotRetrievePasskey"));
      return;
    }
    const result = await verifyU2FLogin({
      checks: { webAuthN: { credentialAssertionData: data } } as Checks,
      requestId,
      redirect,
    });
    if ("error" in result) {
      // result translation handled server side
      setError(result.error);
    }
  }

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      void startU2FLoginFlow();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full">
      {error && (
        <div className="py-4">
          <Alert type={ErrorStatus.ERROR}>{error}</Alert>
        </div>
      )}
    </div>
  );
}
