'use client';

import { useEffect } from 'react';
import { trackAnalyticsEvent } from '@/lib/analytics/client';

interface HomepageAnalyticsClientProps {
  boxSummaries: Array<{
    boxType: string;
    heroContentType: string | null;
    heroContentId: string | null;
    linkItems: Array<{
      contentType: string;
      contentId: string;
    }>;
  }>;
}

export default function HomepageAnalyticsClient({
  boxSummaries,
}: HomepageAnalyticsClientProps) {
  useEffect(() => {
    trackAnalyticsEvent({
      eventName: 'page_view',
      pageType: 'homepage',
      metadata: {
        boxCount: boxSummaries.length,
      },
    });

    for (const [index, box] of boxSummaries.entries()) {
      if (box.heroContentType && box.heroContentId) {
        trackAnalyticsEvent({
          eventName: 'content_impression',
          pageType: 'homepage',
          contentType: box.heroContentType as any,
          contentId: box.heroContentId,
          metadata: {
            slot: index + 1,
            boxType: box.boxType,
            placement: 'hero',
          },
        });
      }

      for (const [linkIndex, item] of box.linkItems.entries()) {
        trackAnalyticsEvent({
          eventName: 'content_impression',
          pageType: 'homepage',
          contentType: item.contentType as any,
          contentId: item.contentId,
          metadata: {
            slot: index + 1,
            boxType: box.boxType,
            placement: 'supporting-link',
            linkPosition: linkIndex + 1,
          },
        });
      }
    }
  }, [boxSummaries]);

  return null;
}
