"use client";

import Link, { type LinkProps } from "next/link";
import type { ReactNode } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import type {
  AnalyticsContentType,
  AnalyticsEventName,
} from "@/lib/analytics/types";

interface TrackedLinkProps extends LinkProps {
  children: ReactNode;
  className?: string;
  eventName?: AnalyticsEventName;
  pageType: string;
  contentType?: AnalyticsContentType;
  contentId?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
}

export default function TrackedLink({
  children,
  className,
  eventName = "cta_clicked",
  pageType,
  contentType,
  contentId,
  metadata,
  onClick,
  ...props
}: TrackedLinkProps & {
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
}) {
  return (
    <Link
      data-analytics-content-type={contentType}
      data-analytics-content-id={contentId || undefined}
      data-analytics-placement={
        typeof metadata?.placement === "string" ? metadata.placement : undefined
      }
      {...props}
      className={className}
      onClick={(event) => {
        trackAnalyticsEvent({
          eventName,
          pageType,
          contentType: contentType ?? null,
          contentId: contentId ?? null,
          metadata: {
            ...metadata,
            ...(eventName === "homepage_slot_clicked"
              ? {
                  slot: Number(
                    (
                      event.currentTarget.closest(
                        "[data-analytics-slot]",
                      ) as HTMLElement | null
                    )?.dataset.analyticsSlot || 0,
                  ),
                }
              : {}),
          },
        });
        onClick?.(event);
      }}
    >
      {children}
    </Link>
  );
}
