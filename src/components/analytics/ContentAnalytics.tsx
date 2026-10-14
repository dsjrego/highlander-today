"use client";
import { useEffect } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import type { AnalyticsContentType } from "@/lib/analytics/types";
export default function ContentAnalytics({
  contentType,
  contentId,
}: {
  contentType: AnalyticsContentType;
  contentId: string;
}) {
  useEffect(() => {
    trackAnalyticsEvent({
      eventName: "page_view",
      contentType,
      contentId,
      pageType: "content-detail",
    });
    trackAnalyticsEvent({
      eventName: "content_open",
      contentType,
      contentId,
      pageType: "content-detail",
    });
  }, [contentType, contentId]);
  return null;
}
