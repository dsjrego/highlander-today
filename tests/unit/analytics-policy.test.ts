import { analyticsDateRange } from "@/lib/analytics/ranges";
import {
  safeAnalyticsPath,
  sanitizeAnalyticsMetadata,
  tenantEventId,
} from "@/lib/analytics/policy";
import { classifyReferrer } from "@/lib/analytics/server";
import { parseReportFilters } from "@/lib/analytics/report";
import { SavedViewsSchema } from "@/lib/analytics/saved-views";
import { csvCell } from "@/lib/analytics/csv";
jest.mock("@/lib/db", () => ({ db: {} }));
describe("analytics policy and reporting contracts", () => {
  it("rejects private/malformed paths and strips query secrets", () => {
    expect(safeAnalyticsPath("/local-life/story?email=private#fragment")).toBe(
      "/local-life/story",
    );
    for (const path of [
      "/admin",
      "/messages/id",
      "//evil.test",
      "/local-life/submit",
      "/profile/id",
      "/%6dessages/private",
      "/memoriam/name/%6danage",
    ])
      expect(safeAnalyticsPath(path)).toBeNull();
  });
  it("allowlists primitive metric metadata", () => {
    expect(
      sanitizeAnalyticsMetadata({
        activeSeconds: 15,
        body: "private",
        email: "private",
        value: Infinity,
        percent: 100,
      }),
    ).toEqual({ activeSeconds: 15, percent: 100 });
  });
  it("deduplicates deterministically within a tenant only", () => {
    expect(tenantEventId("tenant-a", "event")).toBe(
      tenantEventId("tenant-a", "event"),
    );
    expect(tenantEventId("tenant-a", "event")).not.toBe(
      tenantEventId("tenant-b", "event"),
    );
  });
  it("classifies canonical hosts without substring spoofing", () => {
    expect(
      classifyReferrer("https://www.example.test/a", "example.test:3000")
        .referrerType,
    ).toBe("INTERNAL");
    expect(
      classifyReferrer("https://google.evil.test", "example.test").referrerType,
    ).toBe("EXTERNAL");
    expect(
      classifyReferrer("https://bing.com.attacker.test", "example.test")
        .referrerType,
    ).toBe("EXTERNAL");
    expect(
      classifyReferrer("https://www.google.com/search", "example.test")
        .referrerType,
    ).toBe("SEARCH");
  });
  it("validates report ranges, time zones and query dimensions", () => {
    expect(() =>
      parseReportFilters(
        new URLSearchParams("start=2026-02-30&end=2026-03-01"),
      ),
    ).toThrow();
    expect(() =>
      parseReportFilters(new URLSearchParams("timezone=not-a-zone")),
    ).toThrow();
    expect(() =>
      parseReportFilters(new URLSearchParams("device=sql")),
    ).toThrow();
  });
  it("neutralizes spreadsheet formulas and quotes CSV text", () => {
    expect(csvCell('=HYPERLINK("evil")')).toBe('"\'=HYPERLINK(""evil"")"');
    expect(csvCell("plain,text")).toBe('"plain,text"');
  });
  it("bounds saved reports and rejects unsupported dimensions", () => {
    expect(SavedViewsSchema.parse([])).toEqual([]);
    expect(() => SavedViewsSchema.parse(Array(21).fill({}))).toThrow();
  });
  it("uses reporting-zone calendar dates across midnight and DST", () => {
    const now = new Date("2026-10-14T01:00:00Z");
    expect(analyticsDateRange(7, "America/New_York", now)).toEqual({
      start: "2026-10-07",
      end: "2026-10-13",
    });
    expect(analyticsDateRange(7, "UTC", now)).toEqual({
      start: "2026-10-08",
      end: "2026-10-14",
    });
  });
});
