"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

function getSafeReturnTo(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}

function getAccountSettingsHref(session: any) {
  const userId = session?.user?.id;
  return userId ? `/profile/${userId}?tab=account-settings` : "/";
}

export default function SocialLandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }

    const returnTo = getSafeReturnTo(searchParams.get("returnTo"));
    const needsProfileRedirect = Boolean((session?.user as any)?.oauthNeedsProfileRedirect);

    router.replace(needsProfileRedirect ? getAccountSettingsHref(session) : returnTo);
  }, [router, searchParams, session, status]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <p className="text-gray-500">Finishing sign-in...</p>
    </div>
  );
}
