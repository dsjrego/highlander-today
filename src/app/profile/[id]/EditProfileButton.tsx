"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";

interface EditProfileButtonProps {
  profileUserId: string;
}

/**
 * Only renders when the logged-in user is viewing their own profile.
 */
export default function EditProfileButton({ profileUserId }: EditProfileButtonProps) {
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;

  if (!currentUserId || currentUserId !== profileUserId) {
    return null;
  }

  return (
    <Link
      href="/profile/edit"
      className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold text-white shadow-sm hover:shadow-md transition-shadow duration-200"
      style={{ backgroundColor: "#A51E30" }}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
      Edit Profile
    </Link>
  );
}
