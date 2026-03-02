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

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { updateSession } from "@lib/server/session";
import { coerceToArrayBuffer, coerceToBase64Url } from "@lib/utils/base64";
import { useTranslation } from "@i18n";
import { Alert, ErrorStatus } from "@components/ui/form";

/*--------------------------------------------*
 * Parent Relative
 *--------------------------------------------*/
import { verifyU2FLogin } from "../actions";

type PublicKeyCredentialRequestOptionsData = {
  challenge: BufferSource | string;
  timeout?: number;
  rpId?: string;
  allowCredentials?: PublicKeyCredentialDescriptor[];
  userVerification?: "required" | "preferred" | "discouraged";
  [key: string]: unknown;
};

// either loginName or sessionId must be provided
type Props = {
  loginName?: string;
  sessionId?: string;
  requestId?: string;
  login?: boolean;
  organization?: string;
  redirect?: string | null;
};

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
    setError("");
    const session = await updateSession({
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
    }).catch(() => {
      console.error("Error requesting challenge - likely network or server error");
      setError(t("verify.errors.couldNotRequestChallenge"));
      return;
    });

    if (session && "error" in session && session.error) {
      console.error(
        "Error in response when requesting challenge - likely validation or other server error"
      );
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
    const response = await verifyU2FLogin({
      loginName,
      sessionId,
      organization,
      checks: {
        webAuthN: { credentialAssertionData: data },
      } as Checks,
      requestId,
      redirect,
    }).catch(() => {
      setError(t("verify.errors.couldNotVerifyPasskey"));
      return;
    });

    if (response && "error" in response && response.error) {
      setError(response.error);
      return;
    }

    if (response && "redirect" in response && response.redirect) {
      return router.push(response.redirect);
    }

    // If we got here, something went wrong - no redirect or error was returned
    if (!response) {
      setError(t("verify.errors.noResponseReceived"));
    } else {
      setError(t("verify.errors.noRedirectProvided"));
    }
  }

  async function submitLoginAndContinue(
    publicKey: PublicKeyCredentialRequestOptionsData
  ): Promise<boolean | void> {
    publicKey.challenge = coerceToArrayBuffer(publicKey.challenge, "publicKey.challenge");
    if (publicKey.allowCredentials) {
      publicKey.allowCredentials.map((listItem: PublicKeyCredentialDescriptor) => {
        listItem.id = coerceToArrayBuffer(listItem.id, "publicKey.allowCredentials.id");
        // Only allow hardware key transports (USB, NFC, BLE) - excludes platform/internal transports
        listItem.transports = ["usb", "ble", "nfc"] as AuthenticatorTransport[];
      });
    }

    return navigator.credentials
      .get({
        publicKey,
      } as CredentialRequestOptions)
      .then((credential: Credential | null) => {
        if (!credential) {
          setError(t("verify.errors.couldNotRetrievePasskey"));
          return;
        }

        const assertedCredential = credential as PublicKeyCredential;
        const assertionResponse = assertedCredential.response as AuthenticatorAssertionResponse;
        const authData = new Uint8Array(assertionResponse.authenticatorData);
        const clientDataJSON = new Uint8Array(assertionResponse.clientDataJSON);
        const rawId = new Uint8Array(assertedCredential.rawId);
        const sig = new Uint8Array(assertionResponse.signature);
        const userHandle = new Uint8Array(assertionResponse.userHandle || []);
        const data = {
          id: assertedCredential.id,
          rawId: coerceToBase64Url(rawId, "rawId"),
          type: assertedCredential.type,
          response: {
            authenticatorData: coerceToBase64Url(authData, "authData"),
            clientDataJSON: coerceToBase64Url(clientDataJSON, "clientDataJSON"),
            signature: coerceToBase64Url(sig, "sig"),
            userHandle: coerceToBase64Url(userHandle, "userHandle"),
          },
        };

        return submitLogin(data);
      })
      .catch((error: Error) => {
        // Handle U2F verification cancellation or errors
        if (error?.name === "NotAllowedError") {
          setError(t("verify.errors.verificationCancelled"));
        } else {
          setError(t("verify.errors.verificationFailed"));
        }
      });
  }

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      updateSessionForChallenge()
        .then((response) => {
          const pK = response?.challenges?.webAuthN?.publicKeyCredentialRequestOptions?.publicKey;

          if (!pK) {
            setError(t("verify.errors.couldNotRequestChallenge"));
            return;
          }

          return submitLoginAndContinue(pK as PublicKeyCredentialRequestOptionsData).catch(
            (error) => {
              setError(error);
              return;
            }
          );
        })
        .catch((error) => {
          setError(error);
          return;
        });
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
