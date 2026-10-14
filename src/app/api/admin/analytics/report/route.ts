import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  authorizeAnalytics,
  AnalyticsAccessError,
} from "@/lib/analytics/access";
import { getAnalyticsReport, parseReportFilters } from "@/lib/analytics/report";
import { csvCell } from "@/lib/analytics/csv";
import { consumeRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const requested = params.get("community");
    if (requested) z.string().uuid().parse(requested);
    const access = await authorizeAnalytics(request.headers, requested);
    const limit = consumeRateLimit(
      `analytics-report:${access.userId}:${access.community.id}`,
      30,
      60_000,
    );
    if (!limit.allowed)
      return NextResponse.json(
        { error: "Please wait before refreshing." },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfterSeconds) },
        },
      );
    const report = await getAnalyticsReport(
      access.community.id,
      parseReportFilters(params),
    );
    if (params.get("format") === "csv") {
      const rows: unknown[][] = [
        ["Community", access.community.name],
        ["Start", report.filters.start],
        ["End", report.filters.end],
        ["Timezone", report.filters.timezone],
        ["Device", report.filters.device],
        ["Channel", report.filters.channel],
        ["Content type", report.filters.contentType],
        [
          "Definition",
          "Visitors are distinct measured browser IDs, not people. Browser blocking/opt-out causes gaps.",
        ],
        ["Metric", "Current period", "Previous period"],
        ...Object.entries(report.current).map(([k, v]) => [
          k,
          v,
          report.previous[k as keyof typeof report.previous],
        ]),
        [],
        [
          "Date",
          "Page views",
          "Sessions",
          "Distinct browsers",
          "Confirmed actions",
        ],
        ...report.series.map((r) => [
          r.date,
          r.views,
          r.visits,
          r.visitors,
          r.actions,
        ]),
        [],
        [
          "Content",
          "Type",
          "Views/opens",
          "Distinct browsers",
          "Shares",
          "Confirmed actions",
        ],
        ...report.content.map((r) => [
          r.title,
          r.type,
          r.views,
          r.visitors,
          r.shares,
          r.actions,
        ]),
        [],
        ["Channel", "Page views", "Sessions"],
        ...report.channels.map((r) => [r.label, r.views, r.visits]),
      ];
      return new NextResponse(
        "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n"),
        {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="community-analytics-${report.filters.start}-${report.filters.end}.csv"`,
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
          },
        },
      );
    }
    return NextResponse.json(report, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof AnalyticsAccessError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: "Choose a valid date range and filters." },
        { status: 400 },
      );
    console.error(
      "[analytics] Report failed",
      error instanceof Error ? error.name : "unknown",
    );
    return NextResponse.json(
      { error: "The report could not be loaded. Please retry." },
      { status: 503 },
    );
  }
}
