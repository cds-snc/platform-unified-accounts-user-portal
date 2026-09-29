"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getImageUrl } from "@lib/utils/imageUrl";
import { Button } from "@components/ui/button/Button";
import { Image } from "@components/ui/image/Image";
import { ToastContainer } from "@components/ui/toast/Toast";
import { toast } from "@components/ui/toast/Toast";

/*--------------------------------------------*
 * Parent Relative
 *--------------------------------------------*/
import { removeTOTPAction, removeU2FAction } from "../actions";

import { ConfirmDeleteMFADialog } from "./ConfirmDeleteMFA";

export const MFAAuthentication = ({
  u2fList,
  authenticatorStatus,
  className,
}: {
  u2fList: Array<{ id: string; name: string; state?: string }>;
  authenticatorStatus: boolean;
  className?: string;
}) => {
  const { t } = useTranslation("account");

  const [mfaForDeletion, setMfaForDeletion] = useState<{ id: string; name: string }>();
  const hasMFAMethods = (Array.isArray(u2fList) && u2fList.length > 0) || authenticatorStatus;
  const hasMultipleMFAMethods = (u2fList.length > 0 && authenticatorStatus) || u2fList.length > 1;

  const handleRemoveU2F = async (u2fId: string) => {
    const result = await removeU2FAction(u2fId);
    if ("error" in result) {
      toast.error(
        result.error || t("mfaAuthentication.errors.failedToRemoveSecurityKey"),
        "account-authentication"
      );
      return;
    }
    toast.success(t("mfaAuthentication.success.keyRemoved"), "account-authentication");
  };

  const handleRemoveAuthenticator = async () => {
    const result = await removeTOTPAction();
    if ("error" in result) {
      toast.error(
        result.error || t("mfaAuthentication.errors.failedToRemoveAuthApp"),
        "account-authentication"
      );
      return;
    }
    toast.success(t("mfaAuthentication.success.authAppRemoved"), "account-authentication");
  };

  return (
    <>
      <div className={className}>
        <div className="mb-6 flex flex-row items-baseline gap-2">
          <h3 className="-mb-2">{t("mfaAuthentication.title")}</h3>
          <span className="">{t("mfaAuthentication.minimumNum")}</span>
        </div>

        {!hasMFAMethods && <p>{t("mfaAuthentication.noTwoFactor")}</p>}

        {hasMFAMethods && (
          <>
            <div>
              <ul className="list-none p-0">
                {u2fList.length > 0 &&
                  u2fList
                    .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                    .map((data) => {
                      const id = `u2f-${data.id}`;
                      return (
                        <li key={data.id} className="mb-4 flex flex-row">
                          <div className="flex grow items-center gap-2">
                            <Image
                              src={getImageUrl("/img/fingerprint_24px.png")}
                              alt=""
                              width={32}
                              height={32}
                              className="inline-block"
                            />

                            <div id={id} className="flex items-center gap-1">
                              <span className="font-semibold">
                                {t("mfaAuthentication.securityKey")}
                              </span>
                              <span>({data.name || t("mfaAuthentication.unknownDevice")})</span>
                            </div>
                          </div>
                          {hasMultipleMFAMethods && (
                            <div>
                              <Button
                                onClick={() => setMfaForDeletion({ id: data.id, name: data.name })}
                                theme="link"
                                aria-describedby={id}
                              >
                                {t("mfaAuthentication.remove")}
                              </Button>
                            </div>
                          )}
                        </li>
                      );
                    })}

                {authenticatorStatus && (
                  <li className="mb-4 flex flex-row">
                    <div className="flex grow items-center gap-2">
                      <Image
                        src={getImageUrl("/img/verified_user_24px.png")}
                        alt=""
                        width={32}
                        height={32}
                        className="inline-block"
                      />
                      <span className="font-semibold">
                        {t("mfaAuthentication.authenticatorApp")}
                      </span>
                    </div>
                    {hasMultipleMFAMethods && (
                      <div>
                        <Button
                          onClick={() => setMfaForDeletion({ id: "totp", name: "totp" })}
                          theme="link"
                        >
                          {t("mfaAuthentication.remove")}
                        </Button>
                      </div>
                    )}
                  </li>
                )}
              </ul>
            </div>
            <div className="mt-6 flex align-middle">
              <Image
                src={getImageUrl("/img/plus.svg")}
                alt=""
                width={24}
                height={24}
                className="mr-1"
                style={{ color: "" }}
              />{" "}
              <Link href="/mfa/set">{t("mfaAuthentication.addlMethods")}</Link>
            </div>
          </>
        )}
      </div>
      <ToastContainer autoClose={false} containerId="account-authentication" />
      {mfaForDeletion && (
        <ConfirmDeleteMFADialog
          mfaName={mfaForDeletion.name}
          handleClose={() => setMfaForDeletion(undefined)}
          handleConfirm={async () => {
            if (mfaForDeletion) {
              if (mfaForDeletion.id === "totp") {
                await handleRemoveAuthenticator();
              } else {
                await handleRemoveU2F(mfaForDeletion.id);
              }
            }
            setMfaForDeletion(undefined);
          }}
        />
      )}
    </>
  );
};
