"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { useState } from "react";
import { useRouter } from "next/navigation";
import { create, JsonObject } from "@zitadel/client";
import {
  RequestChallengesSchema,
  UserVerificationRequirement as ZitadelUserVerificationRequirement,
} from "@zitadel/proto/zitadel/session/v2/challenge_pb";
import { ChecksSchema } from "@zitadel/proto/zitadel/session/v2/session_service_pb";
import { RegisterU2FResponse } from "@zitadel/proto/zitadel/user/v2/user_service_pb";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { updateSession } from "@lib/server/session";
import { buildUrlWithRequestId } from "@lib/utils";
import { coerceToArrayBuffer, coerceToBase64Url } from "@lib/utils/base64";
import { I18n } from "@i18n";
import { useTranslation } from "@i18n/client";
import { BackButton } from "@components/ui/button/BackButton";
import { SubmitButton } from "@components/ui/button/SubmitButton";
import { Alert, ErrorStatus, Label, TextInput } from "@components/ui/form";

/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/
import { addU2F, verifyU2F } from "../actions";

type PublicKeyCredentialJSON = {
  id: string;
  rawId: string;
  type: string;
  response: {
    attestationObject: string;
    clientDataJSON: string;
  };
};

type CredentialOptionsData =
  | {
      publicKey?: PublicKeyCredentialCreationOptions;
      [key: string]: unknown;
    }
  | undefined;

type Props = {
  sessionId: string;
  requestId?: string;
  checkAfter: boolean;
};

export function RegisterU2f({ sessionId, requestId, checkAfter }: Props) {
  const { t } = useTranslation("u2f");
  const [error, setError] = useState<string>("");
  const [keyName, setKeyName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();

  async function submitVerify(
    u2fId: string,
    passkeyName: string,
    publicKeyCredential: PublicKeyCredentialJSON,
    sessionId: string
  ) {
    setError("");
    setLoading(true);

    let response;
    try {
      response = await verifyU2F({
        u2fId,
        passkeyName,
        publicKeyCredential,
        sessionId,
      });
    } catch (e) {
      setError("set.errors.verificationFailed");
      setLoading(false);
      return;
    }
    setLoading(false);

    if (response && "error" in response && response?.error) {
      setError(response?.error);
      return;
    }

    return response;
  }

  async function submitRegisterAndContinue(): Promise<boolean | void | null> {
    setError("");
    setLoading(true);

    let response;
    try {
      response = await addU2F({
        sessionId,
      });
    } catch (e) {
      setError("set.errors.credentialRegistrationFailed");
      setLoading(false);
      return;
    }
    setLoading(false);

    if (response && "error" in response && response?.error) {
      setError(response?.error);
      return;
    }

    if (!response || !("u2fId" in response)) {
      setError("set.errors.credentialRegistrationFailed");
      return;
    }

    const u2fResponse = response as unknown as RegisterU2FResponse;

    const u2fId = u2fResponse.u2fId;

    // The publicKeyCredentialCreationOptions is a structpb.Struct
    // We need to extract the actual object from it
    let credentialOptions: CredentialOptionsData = u2fResponse.publicKeyCredentialCreationOptions;

    // Try to convert protobuf Struct to plain object
    try {
      // Use JSON serialization to get a plain object
      credentialOptions = JSON.parse(JSON.stringify(credentialOptions));
    } catch (e) {
      // Handle error silently
    }

    if (!credentialOptions || !credentialOptions.publicKey) {
      setError("set.errors.invalidCredentialOptions");
      return;
    }

    const options: CredentialCreationOptions = { publicKey: credentialOptions.publicKey };

    if (options.publicKey) {
      // Force U2F hardware key (not passkey)
      // These settings explicitly prevent passkey managers like 1Password from responding
      options.publicKey.authenticatorSelection = {
        authenticatorAttachment: "cross-platform" as AuthenticatorAttachment,
        residentKey: "discouraged" as ResidentKeyRequirement,
        requireResidentKey: false,
        userVerification: "discouraged",
      };

      // For U2F, we want direct attestation to prevent passkey prompts
      options.publicKey.attestation = "direct" as AttestationConveyancePreference;

      options.publicKey.challenge = coerceToArrayBuffer(options.publicKey.challenge, "challenge");
      options.publicKey.user.id = coerceToArrayBuffer(options.publicKey.user.id, "userid");

      if (options.publicKey.excludeCredentials) {
        options.publicKey.excludeCredentials.map((cred: PublicKeyCredentialDescriptor) => {
          cred.id = coerceToArrayBuffer(cred.id as unknown as string, "excludeCredentials.id");
          // Only allow hardware key transports (USB, NFC, BLE) - excludes platform/internal transports
          cred.transports = ["usb", "ble", "nfc"] as AuthenticatorTransport[];
          return cred;
        });
      }

      let resp: PublicKeyCredential | null;
      try {
        // Add a timeout wrapper in case the call hangs
        const createPromise = window.navigator.credentials.create(options);
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Credential creation timed out after 60s")), 60000)
        );

        resp = (await Promise.race([createPromise, timeoutPromise])) as PublicKeyCredential;
      } catch (credError) {
        setError("set.errors.credentialCreationFailed");
        setLoading(false);
        return;
      }

      if (
        !resp ||
        !("response" in resp) ||
        !("attestationObject" in resp.response) ||
        !("clientDataJSON" in resp.response) ||
        !("id" in resp)
      ) {
        setError("set.errors.credentialRegistrationFailed");
        return;
      }

      const attestationObject = (resp.response as AuthenticatorAttestationResponse)
        .attestationObject;
      const clientDataJSON = (resp.response as AuthenticatorAttestationResponse).clientDataJSON;
      const rawId = resp.id;

      const data = {
        id: resp.id,
        rawId: coerceToBase64Url(rawId, "rawId"),
        type: resp.type,
        response: {
          attestationObject: coerceToBase64Url(attestationObject, "attestationObject"),
          clientDataJSON: coerceToBase64Url(clientDataJSON, "clientDataJSON"),
        },
      };

      const submitResponse = await submitVerify(u2fId, keyName, data, sessionId);

      if (!submitResponse) {
        setError("set.errors.verificationFailed");
        setLoading(false);
        return;
      }

      if (checkAfter) {
        // Step 1: request a WebAuthn assertion challenge for the active session.
        const challengeResponse = await updateSession({
          sessionId,
          requestId,
          challenges: create(RequestChallengesSchema, {
            webAuthN: {
              domain: "",
              userVerificationRequirement: ZitadelUserVerificationRequirement.DISCOURAGED,
            },
          }),
        }).catch(() => {
          setError("set.errors.sessionVerificationFailed");
          return;
        });

        if (
          !challengeResponse ||
          ("error" in challengeResponse && challengeResponse.error) ||
          !challengeResponse.challenges?.webAuthN?.publicKeyCredentialRequestOptions?.publicKey
        ) {
          setError("set.errors.sessionVerificationFailed");
          return;
        }

        const publicKeyCredentialRequestOptions = challengeResponse.challenges.webAuthN
          .publicKeyCredentialRequestOptions
          .publicKey as unknown as PublicKeyCredentialRequestOptions;

        publicKeyCredentialRequestOptions.challenge = coerceToArrayBuffer(
          publicKeyCredentialRequestOptions.challenge,
          "publicKey.challenge"
        );

        if (publicKeyCredentialRequestOptions.allowCredentials) {
          publicKeyCredentialRequestOptions.allowCredentials.map(
            (listItem: PublicKeyCredentialDescriptor) => {
              listItem.id = coerceToArrayBuffer(listItem.id, "publicKey.allowCredentials.id");
              listItem.transports = ["usb", "ble", "nfc"] as AuthenticatorTransport[];
              return listItem;
            }
          );
        }

        // Step 2: run navigator.credentials.get() to produce assertion data.
        const credential = await navigator.credentials
          .get({
            publicKey: publicKeyCredentialRequestOptions,
          } as CredentialRequestOptions)
          .catch(() => {
            setError("set.errors.sessionVerificationFailed");
            return;
          });

        if (!credential) {
          setError("set.errors.sessionVerificationFailed");
          return;
        }

        const assertedCredential = credential as PublicKeyCredential;
        const assertionResponse = assertedCredential.response as AuthenticatorAssertionResponse;
        const authData = new Uint8Array(assertionResponse.authenticatorData);
        const clientDataJSON = new Uint8Array(assertionResponse.clientDataJSON);
        const rawId = new Uint8Array(assertedCredential.rawId);
        const sig = new Uint8Array(assertionResponse.signature);
        const userHandle = new Uint8Array(assertionResponse.userHandle || []);

        const assertionData = {
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

        // Step 3: submit the assertion as WebAuthN session checks.
        const verificationResponse = await updateSession({
          sessionId,
          requestId,
          checks: create(ChecksSchema, {
            webAuthN: {
              credentialAssertionData: assertionData,
            },
          }),
        }).catch(() => {
          setError("set.errors.sessionVerificationFailed");
          return;
        });

        if (
          !verificationResponse ||
          ("error" in verificationResponse && verificationResponse.error)
        ) {
          setError("set.errors.sessionVerificationFailed");
          return;
        }

        // Session is verified inline, so continue without a separate /u2f verify hop.
        const params = new URLSearchParams({});
        if (requestId) {
          params.append("requestId", requestId);
        }

        return router.push(`/all-set?` + params);
      } else {
        // Redirect to all-set page after successful setup
        return router.push(buildUrlWithRequestId("/all-set", requestId));
      }
    }
  }

  return (
    <form onSubmit={(e) => e.preventDefault()}>
      {error && (
        <div>
          <Alert type={ErrorStatus.ERROR}>
            <I18n i18nKey={error} namespace="u2f" />
          </Alert>
        </div>
      )}

      <div className="mb-4">
        <div className="gcds-input-wrapper">
          <Label
            id={"label-keyName"}
            htmlFor={"keyName"}
            hint={
              <I18n
                i18nKey="set.hint"
                namespace="u2f"
                tagName="div"
                className="text-base font-normal text-gcds-grayscale-500"
              />
            }
          >
            <I18n i18nKey="set.label" namespace="u2f" />
          </Label>
          <TextInput
            id={"keyName"}
            type="text"
            onChange={(e) => setKeyName((e.target as HTMLInputElement).value)}
            placeholder={t("set.placeholder")}
          />
        </div>
      </div>

      <div className="mt-8 flex w-full flex-row items-center">
        <BackButton data-testid="back-button" />
        <SubmitButton
          className="ml-4"
          type="button"
          loading={loading}
          disabled={loading}
          onClick={submitRegisterAndContinue}
          data-testid="submit-button"
        >
          <I18n i18nKey="set.submit" namespace="u2f" />
        </SubmitButton>
      </div>
    </form>
  );
}
