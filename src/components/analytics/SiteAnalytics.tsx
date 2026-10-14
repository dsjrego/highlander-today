"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { onCLS, onINP, onLCP } from "web-vitals";
import { usePathname } from "next/navigation";
import {
  analyticsAllowed,
  beginAnalyticsPage,
  isAnalyticsOptedOut,
  setAnalyticsOptOut,
  trackAnalyticsEvent,
} from "@/lib/analytics/client";

let vitalsRegistered = false;

export default function SiteAnalytics() {
  const path = usePathname();
  useEffect(() => {
    const initialPath = window.location.pathname;
    const record = (metric: {
      name: string;
      value: number;
      rating: string;
    }) => {
      if (!analyticsAllowed() || !["LCP", "INP", "CLS"].includes(metric.name))
        return;
      trackAnalyticsEvent({
        eventName: "web_vital",
        pageType: "public-page",
        pagePath: initialPath,
        metadata: {
          vital: metric.name,
          value: metric.value,
          rating: metric.rating,
        },
      });
    };
    if (analyticsAllowed() && !vitalsRegistered) {
      vitalsRegistered = true;
      onCLS(record);
      onINP(record);
      onLCP(record);
    }
  }, []);
  useLayoutEffect(() => {
    beginAnalyticsPage(path);
  }, [path]);
  useEffect(() => {
    if (!analyticsAllowed()) return;
    let lastActivity = Date.now();
    const active = () => {
      lastActivity = Date.now();
    };
    const match = path.match(
      /^\/(local-life|recipes|events|marketplace|help-wanted)\/([0-9a-f-]{36})$/i,
    );
    const contentType = match
      ? (
          {
            "local-life": "ARTICLE",
            recipes: "RECIPE",
            events: "EVENT",
            marketplace: "MARKETPLACE_LISTING",
            "help-wanted": "HELP_WANTED_POST",
          } as Record<
            string,
            | "ARTICLE"
            | "RECIPE"
            | "EVENT"
            | "MARKETPLACE_LISTING"
            | "HELP_WANTED_POST"
          >
        )[match[1]]
      : undefined;
    const view = window.setTimeout(() => {
      const context =
        contentType && match ? { contentType, contentId: match[2] } : {};
      trackAnalyticsEvent({
        ...context,
        eventName: "page_view",
        pageType: path === "/" ? "homepage" : "public-page",
        pagePath: path,
      });
      if (contentType)
        trackAnalyticsEvent({
          ...context,
          eventName: "content_open",
          pageType: "content-detail",
          pagePath: path,
        });
    }, 100);
    const scroll = () => {
      const distance =
        document.documentElement.scrollHeight - window.innerHeight;
      if (distance <= 0 || document.visibilityState !== "visible") return;
      const depth = Math.min(
        100,
        Math.round((window.scrollY / distance) * 100),
      );
      for (const percent of [25, 50, 75, 100])
        if (depth >= percent)
          trackAnalyticsEvent({
            eventName: "scroll_depth_reached",
            pageType: "public-page",
            pagePath: path,
            metadata: { percent },
          });
    };
    window.addEventListener("scroll", scroll, { passive: true });
    const heartbeat = window.setInterval(() => {
      if (
        document.visibilityState === "visible" &&
        document.hasFocus() &&
        Date.now() - lastActivity < 60_000
      ) {
        trackAnalyticsEvent({
          eventName: "engaged_time_ping",
          pageType: "public-page",
          pagePath: path,
          metadata: { activeSeconds: 15 },
        });
      }
    }, 15_000);
    for (const event of ["pointerdown", "keydown", "scroll", "pointermove"])
      window.addEventListener(event, active, { passive: true });
    return () => {
      window.removeEventListener("scroll", scroll);
      clearTimeout(view);
      clearInterval(heartbeat);
      for (const event of ["pointerdown", "keydown", "scroll", "pointermove"])
        window.removeEventListener(event, active);
    };
  }, [path]);
  return null;
}

export function AnalyticsPrivacyControl() {
  const [disabled, setDisabled] = useState(false);
  useEffect(() => {
    setDisabled(isAnalyticsOptedOut());
  }, []);
  return (
    <button
      type="button"
      className="text-sm underline underline-offset-4"
      aria-pressed={disabled}
      onClick={() => {
        setAnalyticsOptOut(!disabled);
        setDisabled(isAnalyticsOptedOut());
      }}
    >
      Audience measurement: {disabled ? "off" : "on"}
    </button>
  );
}
