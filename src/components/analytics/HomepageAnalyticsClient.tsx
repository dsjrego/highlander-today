"use client";

import { useEffect } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import type { AnalyticsContentType } from "@/lib/analytics/types";

interface HomepageAnalyticsClientProps {
  boxSummaries: Array<{
    boxType: string;
    heroContentType: string | null;
    heroContentId: string | null;
    linkItems: Array<{ contentType: string; contentId: string }>;
  }>;
}
/** A placement is impressed once after 50% is visible continuously for one second. */
export default function HomepageAnalyticsClient({
  boxSummaries,
}: HomepageAnalyticsClientProps) {
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const timers = new Map<Element, ReturnType<typeof setTimeout>>();
    const seen = new Set<string>();
    document
      .querySelectorAll<HTMLElement>("[data-analytics-homepage-box]")
      .forEach((box, index) => {
        box.dataset.analyticsSlot = String(index + 1);
      });
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          const prior = timers.get(el);
          if (prior) clearTimeout(prior);
          timers.delete(el);
          if (
            entry.intersectionRatio < 0.5 ||
            document.visibilityState !== "visible"
          )
            continue;
          timers.set(
            el,
            setTimeout(() => {
              const box = el.closest<HTMLElement>(
                "[data-analytics-homepage-box]",
              );
              const key = `${box?.dataset.analyticsSlot}:${el.dataset.analyticsContentType}:${el.dataset.analyticsContentId}:${el.dataset.analyticsPlacement}`;
              if (seen.has(key)) return;
              seen.add(key);
              trackAnalyticsEvent({
                eventName: "content_impression",
                pageType: "homepage",
                contentType: el.dataset
                  .analyticsContentType as AnalyticsContentType,
                contentId: el.dataset.analyticsContentId,
                metadata: {
                  slot: Number(box?.dataset.analyticsSlot || 0),
                  boxType: box?.dataset.analyticsHomepageBox || "",
                  placement: el.dataset.analyticsPlacement || "",
                },
              });
              observer.unobserve(el);
              timers.delete(el);
            }, 1000),
          );
        }
      },
      { threshold: [0, 0.5] },
    );
    const targets = document.querySelectorAll(
      "[data-analytics-content-id][data-analytics-placement]",
    );
    targets.forEach((el) => observer.observe(el));
    const visibility = () => {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
      if (document.visibilityState === "visible")
        targets.forEach((el) => {
          observer.unobserve(el);
          observer.observe(el);
        });
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      observer.disconnect();
      for (const timer of timers.values()) clearTimeout(timer);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [boxSummaries]);
  return null;
}
