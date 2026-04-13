"use client";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import Image from "next/image";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { getImageUrl } from "@lib/imageUrl";
import { cn } from "@lib/utils";

type Props = {
  method: string;
  title: string;
  icon: string;
  description: string;
  isSelected: boolean;
  isDefault?: boolean;
  defaultText?: string;
  onSelect: (method: string, url: string) => void;
  url: string;
};

export function MethodOptionCard({
  method,
  title,
  icon,
  description,
  isSelected,
  isDefault,
  defaultText = "Default",
  onSelect,
  url,
}: Props) {
  const handleClick = () => {
    onSelect(method, url);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      handleClick();
    }
  };

  return (
    <div
      className={cn(
        "cursor-pointer rounded-md border-2 p-6 transition-all",
        isSelected ? "border-gcds-blue-vivid bg-blue-50" : "border-gray-300 hover:border-gray-400"
      )}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Image src={getImageUrl(icon)} alt={title} width={32} height={32} className="mt-1" />
          <div>
            <div className="font-bold">
              {title}
              {isDefault && (
                <>
                  {" "}
                  <span className="italic">{defaultText}</span>
                </>
              )}
            </div>
            <div className="text-sm text-gray-600">{description}</div>
          </div>
        </div>
        {isSelected && (
          <Image src={getImageUrl("/img/check_24px.png")} alt="Selected" width={24} height={24} />
        )}
      </div>
    </div>
  );
}
