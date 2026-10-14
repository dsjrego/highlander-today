import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  ContentReactionBodySchema,
  ContentReactionQuerySchema,
} from "@/lib/analytics/types";
import { resolveAnalyticsCommunity } from "@/lib/analytics/access";
import { analyticsContentExists } from "@/lib/analytics/content";
import { createReactionAnalyticsEvent } from "@/lib/analytics/server";

async function reactionCommunity(
  request: NextRequest,
  contentType: (typeof import("@/lib/analytics/types").ANALYTICS_CONTENT_TYPES)[number],
  contentId: string,
) {
  const communityId = await resolveAnalyticsCommunity(request.headers);
  if (!communityId) return null;
  if (contentType === "ROADMAP_IDEA") {
    if (request.headers.get("x-user-role") !== "SUPER_ADMIN") return null;
    return (await db.roadmapIdea.findFirst({
      where: { id: contentId, communityId },
      select: { id: true },
    }))
      ? communityId
      : null;
  }
  return (await analyticsContentExists(communityId, contentType, contentId))
    ? communityId
    : null;
}

export async function GET(request: NextRequest) {
  try {
    const parsed = ContentReactionQuerySchema.parse({
      contentType: request.nextUrl.searchParams.get("contentType"),
      contentId: request.nextUrl.searchParams.get("contentId"),
    });

    const communityId = await reactionCommunity(
      request,
      parsed.contentType,
      parsed.contentId,
    );
    if (!communityId)
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    const [summaryRows, currentUserReaction] = await Promise.all([
      db.contentReaction.groupBy({
        by: ["reactionType"],
        where: {
          communityId,
          contentType: parsed.contentType,
          contentId: parsed.contentId,
        },
        _count: {
          _all: true,
        },
      }),
      request.headers.get("x-user-id")
        ? db.contentReaction.findFirst({
            where: {
              communityId,
              userId: request.headers.get("x-user-id") as string,
              contentType: parsed.contentType,
              contentId: parsed.contentId,
            },
            select: { reactionType: true },
          })
        : Promise.resolve(null),
    ]);

    return NextResponse.json({
      currentUserReaction: currentUserReaction?.reactionType ?? null,
      summary: Object.fromEntries(
        summaryRows.map((row) => [row.reactionType, row._count._all]),
      ),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Error fetching reactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch reactions" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = ContentReactionBodySchema.parse(body);
    const communityId = await reactionCommunity(
      request,
      parsed.contentType,
      parsed.contentId,
    );

    if (!communityId) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    const previous = await db.contentReaction.findUnique({
      where: {
        userId_contentType_contentId: {
          userId,
          contentType: parsed.contentType,
          contentId: parsed.contentId,
        },
      },
      select: {
        id: true,
        communityId: true,
        reactionType: true,
      },
    });

    if (previous?.communityId && previous.communityId !== communityId)
      return NextResponse.json(
        { error: "Reaction unavailable" },
        { status: 409 },
      );
    const reaction = await db.contentReaction.upsert({
      where: {
        userId_contentType_contentId: {
          userId,
          contentType: parsed.contentType,
          contentId: parsed.contentId,
        },
      },
      update: {
        communityId,
        reactionType: parsed.reactionType,
      },
      create: {
        communityId,
        userId,
        contentType: parsed.contentType,
        contentId: parsed.contentId,
        reactionType: parsed.reactionType,
      },
    });

    if (previous?.reactionType !== parsed.reactionType)
      await createReactionAnalyticsEvent({
        communityId,
        siteDomain:
          request.headers.get("x-community-domain") ||
          request.headers.get("host"),
        userId,
        contentType: parsed.contentType,
        contentId: parsed.contentId,
        reactionType: parsed.reactionType,
        previousReactionType: previous?.reactionType ?? null,
        staff: ["EDITOR", "ADMIN", "SUPER_ADMIN", "STAFF_WRITER"].includes(
          request.headers.get("x-user-role") || "",
        ),
      });

    return NextResponse.json(reaction);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Error saving reaction:", error);
    return NextResponse.json(
      { error: "Failed to save reaction" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = ContentReactionQuerySchema.parse({
      contentType: request.nextUrl.searchParams.get("contentType"),
      contentId: request.nextUrl.searchParams.get("contentId"),
    });

    const communityId = await reactionCommunity(
      request,
      parsed.contentType,
      parsed.contentId,
    );
    if (!communityId)
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    await db.contentReaction.deleteMany({
      where: {
        communityId,
        userId,
        contentType: parsed.contentType,
        contentId: parsed.contentId,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Error deleting reaction:", error);
    return NextResponse.json(
      { error: "Failed to delete reaction" },
      { status: 500 },
    );
  }
}
