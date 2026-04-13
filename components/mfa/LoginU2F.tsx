"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { create, JsonObject } from "@zitadel/client";
import {
  RequestChallengesSchema,
  UserVerificationRequirement,
} from "@zitadel/proto/zitadel/session/v2/challenge_pb";
import { Checks } from "@zitadel/proto/zitadel/session/v2/session_service_pb";

import { verifyU2FLogin } from "@root/app/(auth)/u2f/actions";
/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { updateSession } from "@lib/server/session";
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
  loginName?: string;
  sessionId?: string;
  requestId?: string;
  login?: boolean;
  organization?: string;
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

export function LoginU2F({
  loginName,
  sessionId,
  requestId,
  organization,
  login = true,
  redirect,
}: Props) {
  const [error, setError] = useState<string>("");

  const { t } = useTranslation("u2f");
  const router = useRouter();

  const initialized = useRef(false);

  async function updateSessionForChallenge(
    userVerificationRequirement: number = login
      ? UserVerificationRequirement.REQUIRED
      : UserVerificationRequirement.DISCOURAGED
  ) {
    let session;
    try {
      session = await updateSession({
        loginName,
        sessionId,
        organization,
        challenges: create(RequestChallengesSchema, {
          webAuthN: {
            domain: "",
            userVerificationRequirement,
          },
        }),
        requestId,
      });
    } catch {
      setError(t("verify.errors.couldNotRequestChallenge"));
      return;
    }

    if (session && "error" in session && session.error) {
      setError(
        typeof session.error === "string"
          ? session.error
          : typeof session.error === "object" &&
              session.error &&
              "message" in session.error &&
              typeof session.error.message === "string"
            ? session.error.message
            : t("verify.errors.couldNotRequestChallenge")
      );
      return;
    }

    return session;
  }

  async function submitLogin(data: JsonObject) {
    let response;
    try {
      response = await verifyU2FLogin({
        loginName,
        sessionId,
        organization,
        checks: { webAuthN: { credentialAssertionData: data } } as Checks,
        requestId,
        redirect,
      });
    } catch {
      setError(t("verify.errors.couldNotVerifyPasskey"));
      return;
    }

    if (response && "error" in response && response.error) {
      setError(response.error);
      return;
    }

    if (response && "redirect" in response && response.redirect) {
      return router.push(response.redirect);
    }

    if (!response) {
      setError(t("verify.errors.noResponseReceived"));
    } else {
      setError(t("verify.errors.noRedirectProvided"));
    }
  }

  async function startU2FLoginFlow() {
    const response = await updateSessionForChallenge();
    const publicKey = response?.challenges?.webAuthN?.publicKeyCredentialRequestOptions?.publicKey;

    if (!publicKey) {
      setError(t("verify.errors.couldNotRequestChallenge"));
      return;
    }

    try {
      const data = await getCredentialAssertionData(
        publicKey as PublicKeyCredentialRequestOptionsData
      );

      if (!data) {
        setError(t("verify.errors.couldNotRetrievePasskey"));
        return;
      }

      await submitLogin(data);
    } catch (error) {
      if ((error as Error)?.name === "NotAllowedError") {
        setError(t("verify.errors.verificationCancelled"));
      } else {
        setError(t("verify.errors.verificationFailed"));
      }
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
