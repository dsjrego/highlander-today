/** Civil calendar dates in the report's timezone; date arithmetic is DST-independent. */
export function analyticsDateRange(
  days: number,
  timezone = "America/New_York",
  now = new Date(),
) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (key: string) => parts.find((p) => p.type === key)!.value;
  const end = `${get("year")}-${get("month")}-${get("day")}`;
  const start = new Date(`${end}T12:00:00Z`);
  start.setUTCDate(start.getUTCDate() - days + 1);
  return { start: start.toISOString().slice(0, 10), end };
}
