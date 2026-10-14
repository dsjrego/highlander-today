import type { AnalyticsReport } from "./report-types";
export function analyticsInsights(report: AnalyticsReport) {
  const insights: Array<{ title: string; detail: string }> = [];
  const current = report.current,
    prior = report.previous;
  if (current.visits >= 100 && prior.visits >= 100) {
    const change = ((current.visits - prior.visits) / prior.visits) * 100;
    if (Math.abs(change) >= 30)
      insights.push({
        title: "Traffic change to inspect",
        detail: `Sessions ${change > 0 ? "increased" : "decreased"} ${Math.abs(change).toFixed(1)}% (${prior.visits.toLocaleString()} → ${current.visits.toLocaleString()}). Compare acquisition channels and content before attributing a cause.`,
      });
    const gap = current.engaged / current.visits - prior.engaged / prior.visits;
    if (gap < -0.1)
      insights.push({
        title: "Engagement rate declined",
        detail: `The measured engagement rate fell ${Math.abs(gap * 100).toFixed(1)} percentage points. Check device mix, landing pages, performance and measurement coverage.`,
      });
  }
  if (report.health.legacyEvents)
    insights.push({
      title: "Measurement definitions changed",
      detail: `${report.health.legacyEvents.toLocaleString()} legacy events use earlier collection rules. Treat comparisons across the release boundary with care.`,
    });
  return insights;
}
