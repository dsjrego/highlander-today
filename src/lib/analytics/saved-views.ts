import { z } from "zod";
export const SavedViewSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(60),
  days: z.union([z.literal(7), z.literal(30), z.literal(90)]),
  device: z.enum(["all", "desktop", "mobile", "tablet", "unknown"]),
  channel: z.enum([
    "all",
    "SEARCH",
    "DIRECT",
    "INTERNAL",
    "EXTERNAL",
    "UNKNOWN",
    "CAMPAIGN",
  ]),
  contentType: z.enum([
    "all",
    "ARTICLE",
    "EVENT",
    "RECIPE",
    "MARKETPLACE_LISTING",
    "STOREFRONT",
    "HELP_WANTED_POST",
    "ORGANIZATION",
    "STATIC_PAGE",
    "SUPPORT_PAGE",
  ]),
  timezone: z
    .string()
    .max(80)
    .default("America/New_York")
    .refine((value) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: value });
        return true;
      } catch {
        return false;
      }
    }),
  excludeStaff: z.boolean().default(true),
  tab: z.enum([
    "overview",
    "acquisition",
    "audience",
    "content",
    "impact",
    "explorer",
    "health",
    "reports",
  ]),
});
export const SavedViewsSchema = z.array(SavedViewSchema).max(20);
export type SavedView = z.infer<typeof SavedViewSchema>;
