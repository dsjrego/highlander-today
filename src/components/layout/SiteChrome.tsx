'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import BannerActions from './BannerActions';
import { AnalyticsPrivacyControl } from '@/components/analytics/SiteAnalytics';

/** Root layouts persist between routes, so select the chrome on navigation too. */
export function SiteChrome({
  region,
  siteName,
  children,
}: {
  region: 'masthead' | 'footer';
  siteName?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  if (pathname !== '/admin' && !pathname.startsWith('/admin/'))
    return <>{children}</>;

  if (region === 'footer') {
    return (
      <footer className="admin-chrome-footer">
        <AnalyticsPrivacyControl />
      </footer>
    );
  }

  return (
    <header className="admin-chrome-header">
      <Link href="/" className="admin-chrome-identity">
        {siteName}
      </Link>
      <BannerActions />
    </header>
  );
}
