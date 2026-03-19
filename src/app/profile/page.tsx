"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

/**
 * /profile — redirects the logged-in user to their own profile page.
 * If not authenticated, redirects to login.
 */
export default function ProfileRedirectPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated" || !session?.user) {
      router.replace("/login?callbackUrl=/profile");
      return;
    }

    const userId = (session.user as any).id;
    if (userId) {
      router.replace(`/profile/${userId}`);
    }
  }, [session, status, router]);

  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <p className="text-gray-500">Loading your profile...</p>
    </div>
  );
}
