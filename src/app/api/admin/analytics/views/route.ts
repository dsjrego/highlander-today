import { readBoundedAnalyticsJson } from "@/lib/analytics/bounded-json";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  authorizeAnalytics,
  AnalyticsAccessError,
} from "@/lib/analytics/access";
import { SavedViewsSchema } from "@/lib/analytics/saved-views";
import { isSameOriginMutation } from "@/lib/request-security";

async function context(request: NextRequest) {
  const requested = request.nextUrl.searchParams.get("community");
  if (requested) z.string().uuid().parse(requested);
  const access = await authorizeAnalytics(request.headers, requested);
  return {
    communityId: access.community.id,
    key: `analytics_views:${access.userId}`,
  };
}
function errorResponse(error: unknown) {
  if (error instanceof AnalyticsAccessError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  return NextResponse.json(
    { error: "Saved views could not be processed." },
    {
      status:
        error instanceof RangeError
          ? 413
          : error instanceof z.ZodError || error instanceof SyntaxError
            ? 400
            : 503,
    },
  );
}
export async function GET(request: NextRequest) {
  try {
    const communityId_key = await context(request);
    const setting = await db.siteSetting.findUnique({
      where: { communityId_key },
      select: { value: true },
    });
    return NextResponse.json(
      setting ? SavedViewsSchema.parse(JSON.parse(setting.value)) : [],
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
export async function PUT(request: NextRequest) {
  try {
    if (!isSameOriginMutation(request))
      return NextResponse.json(
        { error: "Cross-origin mutation rejected" },
        { status: 403 },
      );
    const communityId_key = await context(request);
    const views = SavedViewsSchema.parse(
      await readBoundedAnalyticsJson(request, 12_000),
    );
    await db.siteSetting.upsert({
      where: { communityId_key },
      create: { ...communityId_key, value: JSON.stringify(views) },
      update: { value: JSON.stringify(views) },
    });
    return NextResponse.json(views, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
