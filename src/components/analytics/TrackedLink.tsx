'use client';

import Link, { type LinkProps } from 'next/link';
import type { ReactNode } from 'react';
import { trackAnalyticsEvent } from '@/lib/analytics/client';
import type { AnalyticsContentType, AnalyticsEventName } from '@/lib/analytics/types';

interface TrackedLinkProps extends LinkProps {
  children: ReactNode;
  className?: string;
  eventName?: AnalyticsEventName;
  pageType: string;
  contentType?: AnalyticsContentType;
  contentId?: string | null;
  metadata?: Record<string, unknown>;
}

export default function TrackedLink({
  children,
  className,
  eventName = 'cta_clicked',
  pageType,
  contentType,
  contentId,
  metadata,
  onClick,
  ...props
}: TrackedLinkProps & { onClick?: React.MouseEventHandler<HTMLAnchorElement> }) {
  return (
    <Link
      {...props}
      className={className}
      onClick={(event) => {
        trackAnalyticsEvent({
          eventName,
          pageType,
          contentType: contentType ?? null,
          contentId: contentId ?? null,
          metadata,
        });
        onClick?.(event);
      }}
    >
      {children}
    </Link>
  );
}
