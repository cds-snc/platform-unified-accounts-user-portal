"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import Link from "next/link";
import { useTranslation } from "react-i18next";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getImageUrl } from "@lib/imageUrl";
import { cn } from "@lib/utils";
import { Button } from "@components/ui/button/Button";
import { Image } from "@components/ui/image/Image";
import { ToastContainer } from "@components/ui/toast/Toast";
import { toast } from "@components/ui/toast/Toast";

/*--------------------------------------------*
 * Parent Relative
 *--------------------------------------------*/
import { removeTOTPAction, removeU2FAction } from "../actions";

export const MFAAuthentication = ({
  u2fList,
  userId,
  authenticatorStatus,
  className,
}: {
  u2fList: Array<{ id: string; name: string; state?: string }>;
  userId: string;
  authenticatorStatus: boolean;
  className?: string;
}) => {
  const { t } = useTranslation("account");
  const hasMFAMethods = (Array.isArray(u2fList) && u2fList.length > 0) || authenticatorStatus;

  const handleRemoveU2F = async (u2fId: string) => {
    const result = await removeU2FAction(userId, u2fId);
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
    const result = await removeTOTPAction(userId);
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
      <div className={cn("rounded-2xl border-1 border-[#D1D5DB] bg-white p-6", className)}>
        <h3 className="mb-6">{t("mfaAuthentication.title")}</h3>

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
                        <li key={data.id} className="mb-4 flex items-center gap-2">
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
                          <span className="">&#8226;</span>
                          <Button
                            onClick={() => handleRemoveU2F(data.id)}
                            theme="link"
                            aria-describedby={id}
                          >
                            {t("mfaAuthentication.remove")}
                          </Button>
                        </li>
                      );
                    })}

                {authenticatorStatus && (
                  <li className="mb-4 flex items-center gap-2">
                    <Image
                      src={getImageUrl("/img/verified_user_24px.png")}
                      alt=""
                      width={32}
                      height={32}
                      className="inline-block"
                    />
                    <span className="font-semibold">{t("mfaAuthentication.authenticatorApp")}</span>
                    <span>&#8226;</span>
                    <Button onClick={handleRemoveAuthenticator} theme="link">
                      {t("mfaAuthentication.remove")}
                    </Button>
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
    </>
  );
};
