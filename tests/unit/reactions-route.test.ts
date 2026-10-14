import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { prismaMock } from "@/__mocks__/prisma";

jest.mock("@/lib/db", () => ({
  db: prismaMock,
}));

const createReactionAnalyticsEventMock = jest.fn(() => Promise.resolve());
jest.mock("@/lib/analytics/server", () => ({
  createReactionAnalyticsEvent: (...args: unknown[]) =>
    createReactionAnalyticsEventMock(...(args as [])),
}));

const reactionRoute =
  require("@/app/api/reactions/route") as typeof import("@/app/api/reactions/route");

function buildRequest(
  url: string,
  method: "GET" | "PUT" | "DELETE",
  body?: unknown,
  headers?: Record<string, string>,
) {
  const request = new Request(url, {
    method,
    headers: {
      "content-type": "application/json",
      "x-community-id": "community-1",
      "x-user-id": "user-1",
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  }) as any;

  request.nextUrl = new URL(url);
  return request;
}

describe("reactions route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prismaMock.article.findFirst as any).mockResolvedValue({
      id: "33333333-3333-4333-8333-333333333333",
    });
    (prismaMock.contentReaction.findFirst as any).mockResolvedValue({
      reactionType: "useful",
    });
  });

  it("returns the current user reaction and summary", async () => {
    (prismaMock.contentReaction.groupBy as any).mockResolvedValue([
      { reactionType: "useful", _count: { _all: 3 } },
      { reactionType: "important", _count: { _all: 1 } },
    ]);
    (prismaMock.contentReaction.findUnique as any).mockResolvedValue({
      reactionType: "useful",
    });

    const response = await reactionRoute.GET(
      buildRequest(
        "http://localhost/api/reactions?contentType=ARTICLE&contentId=33333333-3333-4333-8333-333333333333",
        "GET",
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      currentUserReaction: "useful",
      summary: {
        useful: 3,
        important: 1,
      },
    });
  });

  it("upserts a reaction and logs the analytics event", async () => {
    (prismaMock.article.findUnique as any).mockResolvedValue({
      id: "33333333-3333-4333-8333-333333333333",
    });
    (prismaMock.contentReaction.findUnique as any).mockResolvedValue({
      id: "reaction-1",
      reactionType: "important",
    });
    (prismaMock.contentReaction.upsert as any).mockResolvedValue({
      id: "reaction-1",
      userId: "user-1",
      contentType: "ARTICLE",
      contentId: "33333333-3333-4333-8333-333333333333",
      reactionType: "useful",
    });

    const response = await reactionRoute.PUT(
      buildRequest("http://localhost/api/reactions", "PUT", {
        contentType: "ARTICLE",
        contentId: "33333333-3333-4333-8333-333333333333",
        reactionType: "useful",
      }),
    );

    expect(response.status).toBe(200);
    expect(prismaMock.contentReaction.upsert).toHaveBeenCalledWith({
      where: {
        userId_contentType_contentId: {
          userId: "user-1",
          contentType: "ARTICLE",
          contentId: "33333333-3333-4333-8333-333333333333",
        },
      },
      update: {
        communityId: "community-1",
        reactionType: "useful",
      },
      create: {
        communityId: "community-1",
        userId: "user-1",
        contentType: "ARTICLE",
        contentId: "33333333-3333-4333-8333-333333333333",
        reactionType: "useful",
      },
    });
    expect(createReactionAnalyticsEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        contentType: "ARTICLE",
        contentId: "33333333-3333-4333-8333-333333333333",
        reactionType: "useful",
        previousReactionType: "important",
      }),
    );
  });

  it("deletes a reaction for the current user", async () => {
    (prismaMock.contentReaction.deleteMany as any).mockResolvedValue({
      count: 1,
    });

    const response = await reactionRoute.DELETE(
      buildRequest(
        "http://localhost/api/reactions?contentType=ARTICLE&contentId=33333333-3333-4333-8333-333333333333",
        "DELETE",
      ),
    );

    expect(response.status).toBe(200);
    expect(prismaMock.contentReaction.deleteMany).toHaveBeenCalledWith({
      where: {
        communityId: "community-1",
        userId: "user-1",
        contentType: "ARTICLE",
        contentId: "33333333-3333-4333-8333-333333333333",
      },
    });
  });

  it("rejects foreign/unpublished content before reading or changing reactions", async () => {
    (prismaMock.article.findFirst as any).mockResolvedValue(null);
    const url =
      "http://localhost/api/reactions?contentType=ARTICLE&contentId=33333333-3333-4333-8333-333333333333";
    expect((await reactionRoute.GET(buildRequest(url, "GET"))).status).toBe(
      404,
    );
    expect(
      (await reactionRoute.DELETE(buildRequest(url, "DELETE"))).status,
    ).toBe(404);
    expect(
      (
        await reactionRoute.PUT(
          buildRequest(url, "PUT", {
            contentType: "ARTICLE",
            contentId: "33333333-3333-4333-8333-333333333333",
            reactionType: "useful",
          }),
        )
      ).status,
    ).toBe(404);
    expect(prismaMock.contentReaction.groupBy).not.toHaveBeenCalled();
    expect(prismaMock.contentReaction.upsert).not.toHaveBeenCalled();
    expect(prismaMock.contentReaction.deleteMany).not.toHaveBeenCalled();
  });
  it("does not record an identical reaction retry as another action", async () => {
    (prismaMock.contentReaction.findUnique as any).mockResolvedValue({
      id: "reaction-1",
      communityId: "community-1",
      reactionType: "useful",
    });
    const response = await reactionRoute.PUT(
      buildRequest("http://localhost/api/reactions", "PUT", {
        contentType: "ARTICLE",
        contentId: "33333333-3333-4333-8333-333333333333",
        reactionType: "useful",
      }),
    );
    expect(response.status).toBe(200);
    expect(createReactionAnalyticsEventMock).not.toHaveBeenCalled();
  });
});
