import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { maintainAnalytics } from "@/lib/analytics/maintenance";
export const maxDuration = 300;
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret)
    return NextResponse.json(
      { error: "Analytics maintenance is not configured" },
      { status: 503 },
    );
  const supplied = Buffer.from(request.headers.get("authorization") || "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  )
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await maintainAnalytics(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error(
      "[analytics] Maintenance failed",
      error instanceof Error ? error.name : "unknown",
    );
    return NextResponse.json(
      { error: "Analytics maintenance failed" },
      { status: 503 },
    );
  }
}
