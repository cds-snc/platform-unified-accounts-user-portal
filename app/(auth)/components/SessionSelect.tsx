/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import type { Cookie } from "@lib/cookies";
import { cn } from "@lib/utils";
import { useTranslation } from "@i18n";
/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { Avatar } from "@components/account/user-avatar/Avatar";
import { ArrowRightSelector } from "@components/icons/ArrowRightSelector";
import { OtherAccountIcon } from "@components/icons/OtherAccountIcon";
/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/
type SessionSelectProps = {
  sessions: Map<string, Cookie>;
  selectSession: (sessionId: string) => void;
};

export const SessionSelect = ({ sessions, selectSession }: SessionSelectProps) => {
  const { t } = useTranslation("start");

  return (
    <div className="flex flex-col">
      {Array.from(sessions.entries()).map(([id, session], index) => (
        <SessionTile
          key={id}
          ariaLabel={t("session.continueWithAccount", { account: session.loginName })}
          session={session}
          first={index === 0}
          select={() => selectSession(id)}
        />
      ))}
      <SessionTile
        label={t("session.otherAccount")}
        ariaLabel={t("session.continueWithOther")}
        last
        select={() => selectSession("other")}
      />
    </div>
  );
};

const SessionTile = ({
  label,
  ariaLabel,
  session,
  first,
  last,
  select,
}: {
  label?: string;
  ariaLabel?: string;
  session?: Cookie;
  first?: boolean;
  last?: boolean;
  select: () => void;
}) => {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={select}
      className={cn([
        "group flex w-full cursor-pointer items-center gap-4 border-x border-t border-gcds-grayscale-400 bg-white p-4 text-left transition-colors duration-200 hover:border-indigo-700 hover:bg-indigo-50 focus-visible:border-indigo-700 focus-visible:bg-indigo-50 focus-visible:outline-none",
        first && "rounded-t-2xl",
        last && "rounded-b-2xl border-b",
      ])}
    >
      {session ? (
        <Avatar name={session.loginName} loginName={session.loginName} />
      ) : (
        <OtherAccountIcon className="size-9.5 text-gcds-grayscale-600 transition-colors duration-200 group-hover:text-indigo-700 group-focus-visible:text-indigo-700" />
      )}
      <span className="grow text-xl font-normal text-gcds-grayscale-900">
        {label ?? session?.loginName}
      </span>
      <div className="text-gcds-grayscale-600 transition-colors duration-200 group-hover:text-indigo-700 group-focus-visible:text-indigo-700">
        <ArrowRightSelector className="size-6" />
      </div>
    </button>
  );
};
