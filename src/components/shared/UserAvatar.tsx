/* eslint-disable @next/next/no-img-element */

"use client";

interface UserAvatarProps {
  firstName: string;
  lastName: string;
  profilePhotoUrl?: string | null;
  trustLevel?: string | null;
  alt?: string;
  className?: string;
  imageClassName?: string;
  initialsClassName?: string;
  showTrustTick?: boolean;
}

function joinClasses(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

export default function UserAvatar({
  firstName,
  lastName,
  profilePhotoUrl,
  trustLevel,
  alt,
  className,
  imageClassName,
  initialsClassName,
  showTrustTick = true,
}: UserAvatarProps) {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.trim() || "?";
  const showTrustedTick = showTrustTick && trustLevel === "TRUSTED";

  return (
    <div className={joinClasses("relative inline-flex shrink-0", className)}>
      {profilePhotoUrl ? (
        <img
          src={profilePhotoUrl}
          alt={alt ?? `${firstName} ${lastName}`}
          className={joinClasses("h-full w-full rounded-full object-cover", imageClassName)}
        />
      ) : (
        <div
          className={joinClasses(
            "flex h-full w-full items-center justify-center rounded-full bg-[#A51E30] font-bold text-white",
            initialsClassName
          )}
          aria-label={alt ?? `${firstName} ${lastName}`}
        >
          {initials}
        </div>
      )}

      {showTrustedTick ? (
        <span className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#1b9c55] text-white shadow-[0_6px_16px_rgba(15,23,42,0.25)]">
          <svg className="h-3 w-3" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M5 10.5 8.25 13.5 15 6.75"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      ) : null}
    </div>
  );
}
