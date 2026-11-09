"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { useEffect, useRef, useState } from "react";

import { updateSessionForU2FChallenge, verifyU2FLogin } from "@root/app/(auth)/u2f/actions";
import { U2F_ERRORS } from "@root/app/(auth)/u2f/u2f-errors";
import { getSafeErrorMessageFromKey } from "@lib/safeErrorMessage";
/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { coerceToArrayBuffer, coerceToBase64Url } from "@lib/utils/base64";
import type { PublicKeyCredentialAssertionData } from "@lib/validation/validationSchemas";
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
};

async function getCredentialAssertionData(
  publicKey: PublicKeyCredentialRequestOptionsData
): Promise<PublicKeyCredentialAssertionData | null> {
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
  } as CredentialRequestOptions)) as PublicKeyCredential | null;

  if (!credential) {
    return null;
  }

  const assertionResponse = credential.response as AuthenticatorAssertionResponse;
  const authData = new Uint8Array(assertionResponse.authenticatorData);
  const clientDataJSON = new Uint8Array(assertionResponse.clientDataJSON);
  const rawId = new Uint8Array(credential.rawId);
  const sig = new Uint8Array(assertionResponse.signature);
  const userHandle = new Uint8Array(assertionResponse.userHandle || []);

  return {
    id: credential.id,
    rawId: coerceToBase64Url(rawId, "rawId"),
    type: "public-key",
    response: {
      authenticatorData: coerceToBase64Url(authData, "authData"),
      clientDataJSON: coerceToBase64Url(clientDataJSON, "clientDataJSON"),
      signature: coerceToBase64Url(sig, "sig"),
      userHandle: coerceToBase64Url(userHandle, "userHandle"),
    },
  };
}

export function LoginU2F({ requestId }: Props) {
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
        setError("verify.errors.verificationFailed");
        return undefined;
      });

    if (!publicKeyCredential) return;

    const data = await getCredentialAssertionData(
      publicKeyCredential.publicKey as PublicKeyCredentialRequestOptionsData
    );

    if (!data) {
      setError("verify.errors.couldNotRetrievePasskey");
      return;
    }
    const result = await verifyU2FLogin({
      publicKeyCredential: data,
      requestId,
    });
    if (result && "error" in result) {
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
          <Alert type={ErrorStatus.ERROR}>
            {getSafeErrorMessageFromKey({
              errorKey: error,
              fallbackKey: "verify.errors.verificationFailed",
              allowedErrorKeys: [
                ...Object.values(U2F_ERRORS),
                "verify.errors.verificationFailed",
                "verify.errors.couldNotRetrievePasskey",
              ],
              t,
            })}
          </Alert>
        </div>
      )}
    </div>
  );
}
