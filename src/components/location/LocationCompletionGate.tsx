'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';

const ALLOWED_PREFIXES = ['/profile/', '/login', '/complete-trust', '/api/auth'];

export default function LocationCompletionGate() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const sessionUser = session?.user as
    | {
        id?: string;
        needsLocationCompletion?: boolean;
      }
    | undefined;

  useEffect(() => {
    if (status !== 'authenticated' || !sessionUser?.id || !sessionUser.needsLocationCompletion) {
      return;
    }

    if (ALLOWED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
      return;
    }

    const nextPath = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
    router.replace(
      `/profile/${sessionUser.id}?tab=account-settings&complete=location&next=${encodeURIComponent(nextPath)}`
    );
  }, [pathname, router, searchParams, sessionUser?.id, sessionUser?.needsLocationCompletion, status]);

  return null;
}
