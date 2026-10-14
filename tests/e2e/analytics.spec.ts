import { test, expect, type BrowserContext } from "playwright/test";
import { randomUUID } from "node:crypto";
import { encode } from "next-auth/jwt";
import AxeBuilder from "@axe-core/playwright";
import { db } from "../../src/lib/db";
import { ensureDefaultSiteSettings } from "../../src/lib/community";

test.describe("community analytics", () => {
  const communities: string[] = [];
  let editorId: string;
  let articleId: string;
  test.beforeAll(async () => {
    const community = await db.community.create({
      data: {
        name: "Analytics Browser Community",
        slug: `analytics-browser-${randomUUID()}`,
        domain: "127.0.0.1",
      },
    });
    communities.push(community.id);
    await ensureDefaultSiteSettings(community.id);
    communities.push(
      (
        await db.community.create({
          data: {
            name: "Foreign analytics community",
            slug: `foreign-analytics-${randomUUID()}`,
          },
        })
      ).id,
    );
    editorId = (
      await db.user.create({
        data: {
          email: `${randomUUID()}@example.test`,
          firstName: "Analytics",
          lastName: "Editor",
          trustLevel: "TRUSTED",
          dateOfBirth: new Date("1980-01-01"),
          placeRelationships: {
            create: {
              relationshipType: "CURRENT_RESIDENT",
              isPrimary: true,
              isCurrent: true,
              fallbackLocationText: "Test community",
            },
          },
          memberships: {
            create: { communityId: community.id, role: "EDITOR" },
          },
        },
      })
    ).id;
    articleId = (
      await db.article.create({
        data: {
          communityId: community.id,
          authorUserId: editorId,
          title: "Community services guide",
          slug: randomUUID(),
          body: "A measured community guide.",
          status: "PUBLISHED",
          publishedAt: new Date(),
        },
      })
    ).id;
    const occurredAt = new Date();
    occurredAt.setUTCDate(occurredAt.getUTCDate() - 1);
    await db.analyticsEvent.createMany({
      data: [
        {
          communityId: community.id,
          eventName: "page_view",
          contentType: "ARTICLE",
          contentId: articleId,
          pageType: "article-detail",
          pagePath: `/local-life/${articleId}`,
          sessionId: "browser-session",
          anonymousVisitorId: "browser-one",
          occurredAt,
          metadata: {
            schemaVersion: 2,
            device: "mobile",
            pageId: "test-page",
            origin: "browser",
          },
        },
        {
          communityId: communities[1],
          eventName: "page_view",
          pageType: "page",
          pagePath: "/foreign-private-evidence",
          sessionId: "foreign-session",
          anonymousVisitorId: "foreign-browser",
          occurredAt,
        },
      ],
    });
  });
  test.afterAll(async () => {
    await db.analyticsEvent.deleteMany({
      where: { communityId: { in: communities } },
    });
    await db.community.deleteMany({ where: { id: { in: communities } } });
    if (editorId) await db.user.delete({ where: { id: editorId } });
    await db.$disconnect();
  });
  async function signIn(context: BrowserContext) {
    const value = await encode({
      secret: "isolated-browser-test-secret",
      token: {
        sub: editorId,
        id: editorId,
        role: "EDITOR",
        trust_level: "TRUSTED",
        tenantMemberships: [
          {
            communityId: communities[0],
            role: "EDITOR",
            domains: ["127.0.0.1"],
          },
        ],
      },
    });
    await context.addCookies([
      {
        name: "next-auth.session-token",
        value,
        url: "http://127.0.0.1:3105",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
  }
  test("reports measured figures, filters, drills down and saves tenant-private views", async ({
    page,
    context,
  }, testInfo) => {
    await signIn(context);
    await page.goto("/admin/analytics");
    await expect(
      page.getByRole("heading", { name: "Know what brings people back." }),
    ).toBeVisible();
    await expect(page.getByText("Loading community analytics…")).toBeHidden();
    await expect(
      page.getByRole("button", {
        name: "Community services guide",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByText("/foreign-private-evidence")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Community services guide", exact: true })
      .click();
    await expect(
      page.getByRole("link", { name: "View public content" }),
    ).toBeVisible();
    const tabs = page.getByRole("tablist", { name: "Analytics reports" });
    await tabs.getByRole("tab", { name: "Audience", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Observed-browser retention" }),
    ).toBeVisible();
    await tabs.getByRole("tab", { name: "Reports", exact: true }).click();
    await page.getByLabel("Time zone", { exact: true }).selectOption("UTC");
    await page
      .getByLabel("Staff traffic", { exact: true })
      .selectOption("false");
    await page.getByRole("button", { name: "Apply", exact: true }).click();
    await expect(page.getByText("Loading community analytics…")).toBeHidden();
    await page.getByLabel("View name (required)").fill("My mobile audience");
    await page.getByRole("button", { name: "Save current view" }).click();
    await expect(
      page.getByRole("button", { name: "My mobile audience", exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Time zone", { exact: true })).toHaveValue(
      "UTC",
    );
    await expect(page.getByLabel("Staff traffic", { exact: true })).toHaveValue(
      "false",
    );
    await expect(
      page.getByRole("button", { name: "My mobile audience", exact: true }),
    ).toBeVisible();
    await tabs.getByRole("tab", { name: "Overview", exact: true }).click();
    await page.getByLabel("Device", { exact: true }).selectOption("tablet");
    await page.getByRole("button", { name: "Apply", exact: true }).click();
    await expect(
      page.getByText("No events have been measured in this period.", {
        exact: false,
      }),
    ).toBeVisible();
    await page.getByLabel("Device", { exact: true }).selectOption("all");
    await page.getByRole("button", { name: "Apply", exact: true }).click();
    await expect(
      page.getByRole("button", {
        name: "Community services guide",
        exact: true,
      }),
    ).toBeVisible();
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      if (width < 1100) {
        const nav = page.locator(".analytics-mobile-nav");
        await expect(nav).toBeVisible();
        await expect(nav).not.toHaveAttribute("open");
        await nav.locator("summary").click();
        await expect(
          page.getByRole("navigation", { name: "Admin navigation" }),
        ).toBeVisible();
        await nav.locator("summary").click();
      }
      await page.screenshot({
        path: testInfo.outputPath(`analytics-${width}.png`),
        fullPage: true,
      });
    }
    const scan = await new AxeBuilder({ page })
      .include(".analytics-workspace")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(scan.violations).toEqual([]);
  });
  test("authenticates exports and denies foreign tenant reads/saved views", async ({
    context,
    request,
  }) => {
    expect(
      (
        await request.get(
          `/api/admin/analytics/report?community=${communities[0]}`,
        )
      ).status(),
    ).toBe(401);
    await signIn(context);
    const own = await context.request.get(
      `/api/admin/analytics/report?community=${communities[0]}&format=csv`,
    );
    expect(own.status()).toBe(200);
    expect(await own.text()).toContain("Community services guide");
    expect(await own.text()).not.toContain("foreign-private-evidence");
    for (const kind of ["report", "views", "network"])
      expect(
        (
          await context.request.get(
            `/api/admin/analytics/${kind}?community=${communities[1]}`,
          )
        ).status(),
      ).toBe(403);
  });
  test("collects anonymous public traffic with bounded deduplication and rejects private/foreign events", async ({
    request,
  }) => {
    const event = {
      eventId: randomUUID(),
      eventName: "page_view",
      pageType: "public",
      pagePath: "/local-life?email=private",
      metadata: { sessionId: randomUUID(), anonymousVisitorId: randomUUID() },
    };
    const first = await request.post("/api/analytics/events", {
      data: { events: [event] },
      headers: { "user-agent": "Mozilla/5.0 community-browser" },
    });
    expect(first.status()).toBe(200);
    expect(await first.json()).toMatchObject({ accepted: 1 });
    const retry = await request.post("/api/analytics/events", {
      data: { events: [event] },
      headers: { "user-agent": "Mozilla/5.0 community-browser" },
    });
    expect(await retry.json()).toMatchObject({ accepted: 0 });
    const excluded = await request.post("/api/analytics/events", {
      data: {
        events: [
          { ...event, eventId: randomUUID(), pagePath: "/messages/private" },
        ],
      },
      headers: { "user-agent": "Mozilla/5.0 community-browser" },
    });
    expect(await excluded.json()).toMatchObject({ accepted: 0, excluded: 1 });
  });

  test("records public browser navigation once and honors opt-out", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0 Safari/537.36",
    });
    const page = await context.newPage();
    const path = `/local-life/${articleId}`;
    const before = await db.analyticsEvent.count({
      where: {
        communityId: communities[0],
        eventName: "page_view",
        pagePath: path,
      },
    });
    await page.goto(path);
    await expect
      .poll(() =>
        db.analyticsEvent.count({
          where: {
            communityId: communities[0],
            eventName: "page_view",
            pagePath: path,
          },
        }),
      )
      .toBe(before + 1);
    await page
      .getByRole("button", { name: "Audience measurement: on", exact: true })
      .click();
    await page.reload();
    await expect(
      page.getByRole("button", {
        name: "Audience measurement: off",
        exact: true,
      }),
    ).toBeVisible();
    await page.waitForTimeout(800);
    expect(
      await db.analyticsEvent.count({
        where: {
          communityId: communities[0],
          eventName: "page_view",
          pagePath: path,
        },
      }),
    ).toBe(before + 1);
    await context.close();
  });
  test("rejects cross-tenant reactions and confirms a new listing conversation only once", async ({
    context,
    request,
  }) => {
    await signIn(context);
    const foreignArticle = await db.article.create({
      data: {
        communityId: communities[1],
        authorUserId: editorId,
        title: "Foreign private fixture",
        slug: randomUUID(),
        body: "Fixture",
        status: "PUBLISHED",
      },
    });
    const response = await context.request.put("/api/reactions", {
      data: {
        contentType: "ARTICLE",
        contentId: foreignArticle.id,
        reactionType: "useful",
      },
    });
    expect(response.status()).toBe(404);
    expect(
      (
        await request.get(
          `/api/reactions?contentType=ARTICLE&contentId=${foreignArticle.id}`,
        )
      ).status(),
    ).toBe(404);
    const seller = await db.user.create({
      data: {
        email: `${randomUUID()}@example.test`,
        firstName: "Test",
        lastName: "Seller",
        trustLevel: "TRUSTED",
      },
    });
    try {
      const store = await db.store.create({
        data: {
          communityId: communities[0],
          ownerUserId: seller.id,
          name: "Analytics fixture store",
          slug: randomUUID(),
          status: "APPROVED",
        },
      });
      const listing = await db.marketplaceListing.create({
        data: {
          communityId: communities[0],
          authorUserId: seller.id,
          storeId: store.id,
          title: "Community fixture listing",
          priceCents: 100,
          category: "Test",
          contactMethod: "MESSAGE",
          status: "ACTIVE",
        },
      });
      const body = {
        recipientId: seller.id,
        createOnly: true,
        analytics: {
          contentType: "MARKETPLACE_LISTING",
          contentId: listing.id,
          sessionId: randomUUID(),
          anonymousVisitorId: randomUUID(),
        },
      };
      for (let i = 0; i < 2; i++)
        expect(
          (
            await context.request.post("/api/messages", { data: body })
          ).status(),
        ).toBe(200);
      expect(
        await db.analyticsEvent.count({
          where: {
            communityId: communities[0],
            eventName: "message_started_from_content",
            contentId: listing.id,
          },
        }),
      ).toBe(1);
    } finally {
      await db.conversation.deleteMany({
        where: { participants: { some: { userId: seller.id } } },
      });
      await db.store.deleteMany({ where: { ownerUserId: seller.id } });
      await db.user.delete({ where: { id: seller.id } });
    }
  });

  test("platform comparison and shared links preserve the explicitly selected community", async ({
    page,
    context,
  }) => {
    const where = {
      userId_communityId: { userId: editorId, communityId: communities[0] },
    };
    await db.userCommunityMembership.update({
      where,
      data: { role: "SUPER_ADMIN" },
    });
    try {
      await signIn(context);
      await page.goto(
        `/admin/analytics?community=${communities[1]}&timezone=UTC&excludeStaff=false`,
      );
      await expect(page.getByLabel("Community", { exact: true })).toHaveValue(
        communities[1],
      );
      await expect(page.getByText("Loading community analytics…")).toBeHidden();
      await page
        .getByRole("button", { name: "Compare communities", exact: true })
        .click();
      await expect(
        page.getByRole("button", {
          name: "Analytics Browser Community",
          exact: true,
        }),
      ).toBeVisible();
      await page
        .getByRole("button", {
          name: "Analytics Browser Community",
          exact: true,
        })
        .click();
      await expect(page).toHaveURL(new RegExp(`community=${communities[0]}`));
      await page.reload();
      await expect(page.getByLabel("Community", { exact: true })).toHaveValue(
        communities[0],
      );
      await expect(page.getByLabel("Time zone", { exact: true })).toHaveValue(
        "UTC",
      );
      await expect(
        page.getByLabel("Staff traffic", { exact: true }),
      ).toHaveValue("false");
    } finally {
      await db.userCommunityMembership.update({
        where,
        data: { role: "EDITOR" },
      });
    }
  });
});
