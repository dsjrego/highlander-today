import { db } from "@/lib/db";
import type { AnalyticsContentType } from "./types";

/** Resolve a polymorphic reference inside its tenant, never by ID alone. */
export async function analyticsContentExists(
  communityId: string,
  type: AnalyticsContentType,
  id: string,
) {
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)) return false;
  const where = { communityId, id };
  switch (type) {
    case "ARTICLE":
      return Boolean(
        await db.article.findFirst({
          where: { ...where, status: "PUBLISHED" },
          select: { id: true },
        }),
      );
    case "EVENT":
      return Boolean(
        await db.event.findFirst({
          where: { ...where, status: "PUBLISHED" },
          select: { id: true },
        }),
      );
    case "RECIPE":
      return Boolean(
        await db.recipe.findFirst({
          where: { ...where, status: "PUBLISHED" },
          select: { id: true },
        }),
      );
    case "MARKETPLACE_LISTING":
      return Boolean(
        await db.marketplaceListing.findFirst({
          where: { ...where, status: "ACTIVE" },
          select: { id: true },
        }),
      );
    case "HELP_WANTED_POST":
      return Boolean(
        await db.helpWantedPost.findFirst({
          where: { ...where, status: "PUBLISHED" },
          select: { id: true },
        }),
      );
    case "STOREFRONT":
      return Boolean(
        await db.store.findFirst({
          where: { ...where, status: "APPROVED" },
          select: { id: true },
        }),
      );
    case "ORGANIZATION":
      return Boolean(
        await db.organization.findFirst({
          where: { ...where, status: "APPROVED" },
          select: { id: true },
        }),
      );
    // Private roadmap pages are excluded; static pages have paths rather than record IDs.
    default:
      return false;
  }
}
