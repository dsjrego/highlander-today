import { createHash } from "node:crypto";
import type { AnalyticsClientEventInput } from "./types";

export const RAW_RETENTION_DAYS = 90;
export const SESSION_IDLE_MS = 30 * 60 * 1000;
export const MAX_BATCH_BYTES = 60 * 1024;
export const BOT_AGENT =
  /bot\b|crawler|spider|headless|lighthouse|preview|facebookexternalhit|slurp/i;
export { PRIVATE_PATH, safeAnalyticsPath } from "./paths";

export function tenantEventId(communityId: string, clientId: string) {
  const h = createHash("sha256")
    .update(`${communityId}:${clientId}`)
    .digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

const textKeys = [
  "slot",
  "boxType",
  "placement",
  "cta",
  "percent",
  "linkPosition",
  "scrollBucket",
  "reactionType",
  "previousReactionType",
  "engagedSeconds",
  "activeSeconds",
  "pageId",
  "device",
  "browser",
  "utmSource",
  "utmMedium",
  "utmCampaign",
  "entryChannel",
  "entryHost",
  "clientVersion",
  "vital",
  "value",
  "rating",
] as const;
export function sanitizeAnalyticsMetadata(
  input: AnalyticsClientEventInput["metadata"],
) {
  const result: Record<string, string | number> = {};
  for (const key of textKeys) {
    const value = input?.[key];
    if (typeof value === "string")
      result[key] = value.replace(/[\r\n\x00-\x1f]/g, "").slice(0, 100);
    if (
      typeof value === "number" &&
      Number.isFinite(value) &&
      value >= 0 &&
      value <= 3_600_000
    )
      result[key] = value;
  }
  return result;
}
