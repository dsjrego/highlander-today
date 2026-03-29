/* eslint-disable @next/next/no-img-element */

"use client";

import { useId, useState } from "react";
import UserAvatar from "@/components/shared/UserAvatar";

interface PageHeaderAvatarDialogProps {
  firstName: string;
  lastName: string;
  profilePhotoUrl?: string | null;
  trustLevel?: string | null;
  className?: string;
  imageClassName?: string;
  initialsClassName?: string;
}

export default function PageHeaderAvatarDialog({
  firstName,
  lastName,
  profilePhotoUrl,
  trustLevel,
  className,
  imageClassName,
  initialsClassName,
}: PageHeaderAvatarDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dialogTitleId = useId();
  const fullName = `${firstName} ${lastName}`.trim();

  const avatar = (
    <UserAvatar
      firstName={firstName}
      lastName={lastName}
      profilePhotoUrl={profilePhotoUrl}
      trustLevel={trustLevel}
      className={className}
      imageClassName={imageClassName}
      initialsClassName={initialsClassName}
    />
  );

  if (!profilePhotoUrl) {
    return avatar;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="block appearance-none border-0 bg-transparent p-0 leading-none transition-transform hover:scale-[1.02] focus:outline-none"
        aria-label={`View larger profile image for ${fullName}`}
      >
        <span className="block rounded-full focus-visible:ring-2 focus-visible:ring-cyan-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950/20">
          {avatar}
        </span>
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/78 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby={dialogTitleId}
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative w-full max-w-3xl rounded-[32px] border border-white/10 bg-[linear-gradient(165deg,rgba(17,34,52,0.98),rgba(10,24,38,0.98))] p-4 shadow-[0_28px_80px_rgba(2,8,23,0.55)] md:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/72">
                  Profile Image
                </p>
                <h2 id={dialogTitleId} className="mt-2 text-2xl font-semibold tracking-tight text-white">
                  {fullName}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Close
              </button>
            </div>

            <div className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/40">
              <img
                src={profilePhotoUrl}
                alt={fullName}
                className="max-h-[75vh] w-full object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
