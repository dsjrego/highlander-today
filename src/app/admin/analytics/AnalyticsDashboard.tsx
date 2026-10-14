"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { analyticsDateRange as dateRange } from "@/lib/analytics/ranges";
import { analyticsInsights } from "@/lib/analytics/insights";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Download,
  RefreshCw,
  Save,
  Printer,
  SlidersHorizontal,
  BarChart3,
} from "lucide-react";
import type {
  AnalyticsFilters,
  AnalyticsReport,
  BreakdownRow,
  ContentRow,
} from "@/lib/analytics/report-types";
import { SavedViewsSchema, type SavedView } from "@/lib/analytics/saved-views";
import "./analytics.css";

const tabs = [
  ["overview", "Overview"],
  ["acquisition", "Acquisition"],
  ["audience", "Audience"],
  ["content", "Content"],
  ["impact", "Community impact"],
  ["explorer", "Explorer"],
  ["health", "Measurement health"],
  ["reports", "Reports"],
] as const;
type Tab = (typeof tabs)[number][0];
const number = (v: number) => new Intl.NumberFormat("en-US").format(v);
const percent = (v: number, d: number) =>
  d ? `${((v / d) * 100).toFixed(1)}%` : "—";
const friendly = (v: string) =>
  ({
    SEARCH: "Search",
    DIRECT: "Direct / unknown",
    EXTERNAL: "Referrals",
    INTERNAL: "Internal navigation",
    CAMPAIGN: "Campaigns",
    UNKNOWN: "Unknown",
    page_view: "Page view",
    cta_clicked: "CTA clicks",
    share_clicked: "Shares",
    copy_link_clicked: "Link copies",
    comment_created: "Comments created",
    reaction_added: "Reactions",
    message_started_from_content: "Conversations started",
  })[v] || v.replace(/_/g, " ");
const defaults = (): AnalyticsFilters => ({
  ...dateRange(30),
  timezone: "America/New_York",
  device: "all",
  channel: "all",
  contentType: "all",
  excludeStaff: true,
});
function query(filters: AnalyticsFilters, community: string) {
  return new URLSearchParams({
    ...Object.fromEntries(
      Object.entries(filters).map(([k, v]) => [k, String(v)]),
    ),
    community,
  });
}

function Panel({
  title,
  detail,
  children,
}: {
  title: string;
  detail?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="analytics-panel">
      <div className="analytics-panel-header">
        <h3>{title}</h3>
        {detail && <span className="analytics-muted">{detail}</span>}
      </div>
      {children}
    </section>
  );
}
function Empty({
  text = "No measured activity for these filters.",
}: {
  text?: string;
}) {
  return <div className="analytics-empty">{text}</div>;
}
function Delta({ value, previous }: { value: number; previous: number }) {
  if (!previous)
    return (
      <span className="analytics-delta">
        {value ? "No prior baseline" : "No change"}
      </span>
    );
  const delta = ((value - previous) / previous) * 100;
  return (
    <span
      className="analytics-delta"
      style={{ display: "inline-flex", alignItems: "center", gap: 3 }}
    >
      {delta >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{" "}
      {Math.abs(delta).toFixed(1)}% vs prior period
    </span>
  );
}
function Breakdown({
  rows,
  metric = "visits",
  onSelect,
}: {
  rows: BreakdownRow[];
  metric?: "visits" | "views";
  onSelect?: (value: string) => void;
}) {
  const max = Math.max(1, ...rows.map((r) => r[metric]));
  return rows.length ? (
    <div>
      {rows.slice(0, 12).map((r) => (
        <div className="analytics-breakdown" key={r.label}>
          <div className="analytics-breakdown-label">
            {onSelect ? (
              <button
                className="analytics-link"
                type="button"
                onClick={() => onSelect(r.label)}
              >
                {friendly(r.label)}
              </button>
            ) : (
              <span>{friendly(r.label)}</span>
            )}
            <strong>{number(r[metric])}</strong>
          </div>
          <div className="analytics-track" aria-hidden="true">
            <span style={{ width: `${(r[metric] / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  ) : (
    <Empty />
  );
}

function Trend({ report }: { report: AnalyticsReport }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [index, setIndex] = useState(report.series.length - 1);
  const [previous, setPrevious] = useState(true);
  useEffect(() => {
    const o = new ResizeObserver((entries) =>
      setWidth(entries[0].contentRect.width),
    );
    if (ref.current) o.observe(ref.current);
    return () => o.disconnect();
  }, []);
  useEffect(() => setIndex(report.series.length - 1), [report]);
  const h = 250,
    left = 46,
    right = 12,
    top = 18,
    bottom = 36,
    plotW = Math.max(1, width - left - right),
    plotH = h - top - bottom;
  const rawMax = Math.max(
    1,
    ...report.series.flatMap((r) => [r.visits, previous ? r.previous : 0]),
  );
  const magnitude = Math.pow(
    10,
    Math.max(0, Math.floor(Math.log10(rawMax)) - 1),
  );
  const max = Math.max(2, Math.ceil(rawMax / (2 * magnitude)) * 2 * magnitude);
  const y = (n: number) => top + plotH - (n / max) * plotH;
  const x = (i: number) =>
    left + (i / Math.max(1, report.series.length - 1)) * plotW;
  const path = (key: "visits" | "previous") =>
    report.series
      .map((r, i) => `${i ? "L" : "M"}${x(i)},${y(r[key])}`)
      .join(" ");
  const row = report.series[Math.min(index, report.series.length - 1)];
  return (
    <div ref={ref}>
      <div className="analytics-chart-legend">
        <span>━ Current sessions</span>
        <button
          type="button"
          aria-pressed={previous}
          onClick={() => setPrevious(!previous)}
        >
          ┄ Previous period {previous ? "visible" : "hidden"}
        </button>
      </div>
      <svg
        className="analytics-chart"
        viewBox={`0 0 ${width} ${h}`}
        role="img"
        aria-label="Daily sessions compared with the preceding equal-length period. Exact values are available in the date selector and daily data table."
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setIndex(
            Math.max(
              0,
              Math.min(
                report.series.length - 1,
                Math.round(
                  ((e.clientX - rect.left - left) / plotW) *
                    (report.series.length - 1),
                ),
              ),
            ),
          );
        }}
      >
        {[0, 0.5, 1].map((v) => (
          <g key={v}>
            <line
              className="analytics-grid-line"
              x1={left}
              x2={width - right}
              y1={y(max * v)}
              y2={y(max * v)}
            />
            <text x={left - 8} y={y(max * v) + 4} textAnchor="end">
              {new Intl.NumberFormat("en", {
                notation: "compact",
                maximumFractionDigits: 1,
              }).format(max * v)}
            </text>
          </g>
        ))}
        <text x={left} y={11}>
          Sessions
        </text>
        {!!report.series.length && (
          <path
            className="analytics-area"
            d={`${path("visits")} L${x(report.series.length - 1)},${y(0)} L${left},${y(0)} Z`}
          />
        )}
        {previous && (
          <path className="analytics-previous" d={path("previous")} />
        )}
        <path className="analytics-current" d={path("visits")} />
        {report.series
          .filter(
            (_, i) =>
              i === 0 ||
              i === report.series.length - 1 ||
              (width > 500 && i === Math.floor(report.series.length / 2)),
          )
          .map((r) => {
            const i = report.series.indexOf(r);
            return (
              <text
                key={r.date}
                x={x(i)}
                y={h - 12}
                textAnchor={
                  i === 0
                    ? "start"
                    : i === report.series.length - 1
                      ? "end"
                      : "middle"
                }
              >
                {new Date(r.date + "T12:00:00Z").toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  timeZone: "UTC",
                })}
              </text>
            );
          })}
        {row && (
          <>
            <line
              x1={x(index)}
              x2={x(index)}
              y1={top}
              y2={y(0)}
              stroke="var(--hl-admin-border)"
            />
            <circle
              cx={x(index)}
              cy={y(row.visits)}
              r={4}
              fill="var(--hl-admin-link)"
            />
          </>
        )}
      </svg>
      <div className="analytics-actions">
        <div>
          <label htmlFor="analytics-chart-day">Inspect date</label>
          <select
            id="analytics-chart-day"
            value={Math.min(index, report.series.length - 1)}
            onChange={(e) => setIndex(Number(e.target.value))}
          >
            {report.series.map((r, i) => (
              <option key={r.date} value={i}>
                {r.date}
              </option>
            ))}
          </select>
        </div>
        <span className="analytics-chart-detail">
          {row
            ? `${number(row.visits)} sessions · ${number(row.views)} views · ${number(row.visitors)} distinct browsers · ${number(row.previous)} prior sessions`
            : "No data"}
        </span>
      </div>
    </div>
  );
}

function ContentTable({ rows }: { rows: ContentRow[] }) {
  const [filter, setFilter] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const matches = rows.filter((r) =>
    `${r.title} ${r.category} ${r.author}`
      .toLowerCase()
      .includes(filter.toLowerCase()),
  );
  return (
    <>
      <label htmlFor="analytics-content-search">
        Find content by title, category, or author
      </label>
      <input
        id="analytics-content-search"
        value={filter}
        onChange={(e) => {
          setFilter(e.target.value);
          setPage(0);
        }}
        placeholder="Example: school board"
      />
      <div className="analytics-table-wrap">
        <table className="analytics-table admin-list-table">
          <thead>
            <tr>
              <th>Content</th>
              <th className="analytics-numeric">Views / opens</th>
              <th className="analytics-numeric">Browsers</th>
              <th className="analytics-numeric">Shares</th>
              <th className="analytics-numeric">Confirmed actions</th>
            </tr>
          </thead>
          <tbody>
            {matches.slice(page * 10, page * 10 + 10).map((r) => (
              <ContentTableRow
                key={`${r.type}:${r.id}`}
                row={r}
                open={expanded === r.id}
                onToggle={() => setExpanded(expanded === r.id ? null : r.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
      {!matches.length && <Empty />}
      <div className="analytics-footer">
        <span>
          {matches.length} of {rows.length} top measured items
        </span>
        <div className="analytics-actions">
          <button
            type="button"
            className="analytics-button"
            disabled={!page}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </button>
          <button
            type="button"
            className="analytics-button"
            disabled={(page + 1) * 10 >= matches.length}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </>
  );
}
function ContentTableRow({
  row: r,
  open,
  onToggle,
}: {
  row: ContentRow;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr>
        <td>
          <button
            type="button"
            className="analytics-link"
            aria-expanded={open}
            aria-controls={`analytics-detail-${r.id}`}
            onClick={onToggle}
          >
            {r.title}
          </button>
          <div className="analytics-muted">
            {friendly(r.type)} · {r.category}
          </div>
        </td>
        <td className="analytics-numeric">{number(r.views)}</td>
        <td className="analytics-numeric">{number(r.visitors)}</td>
        <td className="analytics-numeric">{number(r.shares)}</td>
        <td className="analytics-numeric">{number(r.actions)}</td>
      </tr>
      {open && (
        <tr id={`analytics-detail-${r.id}`}>
          <td colSpan={5}>
            <div className="analytics-actions">
              <span>{r.author || "Community content"}</span>
              <span className="analytics-pill">
                {number(r.completion)} sessions reached 100% scroll
              </span>
              <span className="analytics-pill">
                {number(Math.round(r.seconds))} measured active seconds
              </span>
              {r.href && (
                <Link className="analytics-link" href={r.href}>
                  View public content ↗
                </Link>
              )}
            </div>
            <p>
              Scroll depth approximates completion; it does not prove reading.
              Browser counts are deduplicated within this item and selected
              range.
            </p>
          </td>
        </tr>
      )}
    </>
  );
}

export default function AnalyticsDashboard({
  community,
  communities,
}: {
  community: { id: string; name: string };
  communities: Array<{ id: string; name: string }>;
}) {
  const [network, setNetwork] = useState<
    Array<{
      id: string;
      name: string;
      views: number;
      visits: number;
      visitors: number;
      actions: number;
    }>
  >([]);
  const [networkError, setNetworkError] = useState("");
  const [communityId, setCommunityId] = useState(community.id);
  const [filters, setFilters] = useState(defaults);
  const [applied, setApplied] = useState(defaults);
  const [tab, setTab] = useState<Tab>("overview");
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [auto, setAuto] = useState(false);
  const [views, setViews] = useState<SavedView[]>([]);
  const [viewName, setViewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const queryString = query(applied, communityId).toString();
  function chooseCommunity(id: string) {
    setCommunityId(id);
    setReport(null);
    const params = query(applied, id);
    params.set("tab", tab);
    window.history.replaceState(null, "", `?${params}`);
  }
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const f = defaults();
    for (const key of [
      "start",
      "end",
      "timezone",
      "device",
      "channel",
      "contentType",
    ] as const) {
      if (p.has(key)) f[key] = p.get(key)!;
    }
    if (p.has("excludeStaff"))
      f.excludeStaff = p.get("excludeStaff") !== "false";
    setFilters(f);
    setApplied(f);
    const t = p.get("tab");
    if (tabs.some(([key]) => key === t)) setTab(t as Tab);
  }, []);
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setNetwork([]);
    setError("");
    setReport(null);
    fetch(`/api/admin/analytics/report?${queryString}`, {
      signal: abort.signal,
      cache: "no-store",
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Report unavailable");
        return data as AnalyticsReport;
      })
      .then((data) => {
        if (!abort.signal.aborted) setReport(data);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [queryString, revision]);
  useEffect(() => {
    setViews([]);
    setNetwork([]);
    setNotice("");
    const abort = new AbortController();
    fetch(`/api/admin/analytics/views?community=${communityId}`, {
      signal: abort.signal,
      cache: "no-store",
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("Saved views unavailable");
        return SavedViewsSchema.parse(await r.json());
      })
      .then((data) => {
        if (!abort.signal.aborted) setViews(data);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setNotice(e.message);
      });
    return () => abort.abort();
  }, [communityId]);
  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") setRevision((n) => n + 1);
    }, 60_000);
    return () => clearInterval(id);
  }, [auto]);
  function apply(next = filters, nextTab = tab) {
    setApplied({ ...next });
    const p = query(next, communityId);
    p.set("tab", nextTab);
    window.history.replaceState(null, "", `?${p}`);
  }
  function chooseTab(next: Tab) {
    setTab(next);
    const p = new URLSearchParams(window.location.search);
    p.set("tab", next);
    window.history.replaceState(null, "", `?${p}`);
  }
  async function save(next: SavedView[]) {
    setSaving(true);
    setNotice("");
    try {
      const response = await fetch(
        `/api/admin/analytics/views?community=${communityId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setViews(SavedViewsSchema.parse(data));
      setViewName("");
      setNotice("Saved views updated.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Unable to save view.");
    } finally {
      setSaving(false);
    }
  }
  function saveView() {
    const days =
      (Date.parse(applied.end) - Date.parse(applied.start)) / 86400_000 + 1;
    void save([
      ...views,
      {
        id: crypto.randomUUID(),
        name: viewName.trim(),
        days: days <= 7 ? 7 : days <= 30 ? 30 : 90,
        device: applied.device,
        channel: applied.channel,
        contentType: applied.contentType,
        timezone: applied.timezone,
        excludeStaff: applied.excludeStaff,
        tab,
      } as SavedView,
    ]);
  }
  function loadView(view: SavedView) {
    const f = {
      ...defaults(),
      ...dateRange(view.days),
      device: view.device,
      channel: view.channel,
      contentType: view.contentType,
      timezone: view.timezone,
      excludeStaff: view.excludeStaff,
    };
    setFilters(f);
    chooseTab(view.tab);
    apply(f, view.tab);
  }
  const currentName =
    communities.find((c) => c.id === communityId)?.name || community.name;
  const totals = report?.current;
  const engagement = totals ? percent(totals.engaged, totals.visits) : "—";
  const measuredFrom = report?.health.firstEvent?.slice(0, 10);
  return (
    <div className="analytics-workspace">
      <div className="analytics-identity">
        <div>
          <div className="analytics-eyebrow">Community intelligence</div>
          <h2>Know what brings people back.</h2>
          <p>{currentName} · First-party audience and community activity</p>
        </div>
        <div className="analytics-actions">
          <a
            className="analytics-button"
            href={`/api/admin/analytics/report?${queryString}&format=csv`}
          >
            <Download size={15} /> Export CSV
          </a>
          <button
            type="button"
            className="analytics-button"
            onClick={() => window.print()}
          >
            <Printer size={15} /> Print / PDF
          </button>
        </div>
      </div>
      <form
        className="analytics-controls"
        onSubmit={(e) => {
          e.preventDefault();
          apply();
        }}
        aria-label="Analytics filters"
      >
        {communities.length > 1 && (
          <div className="analytics-field">
            <label htmlFor="analytics-community">Community</label>
            <select
              id="analytics-community"
              value={communityId}
              onChange={(e) => {
                chooseCommunity(e.target.value);
                setReport(null);
              }}
            >
              {communities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="analytics-field">
          <label htmlFor="analytics-start">From</label>
          <input
            id="analytics-start"
            type="date"
            required
            value={filters.start}
            onChange={(e) => setFilters({ ...filters, start: e.target.value })}
          />
        </div>
        <div className="analytics-field">
          <label htmlFor="analytics-end">Through</label>
          <input
            id="analytics-end"
            type="date"
            required
            value={filters.end}
            onChange={(e) => setFilters({ ...filters, end: e.target.value })}
          />
        </div>
        <div className="analytics-field">
          <label htmlFor="analytics-device">Device</label>
          <select
            id="analytics-device"
            value={filters.device}
            onChange={(e) => setFilters({ ...filters, device: e.target.value })}
          >
            {["all", "desktop", "mobile", "tablet", "unknown"].map((v) => (
              <option key={v} value={v}>
                {v === "all" ? "All devices" : friendly(v)}
              </option>
            ))}
          </select>
        </div>
        <div className="analytics-field">
          <label htmlFor="analytics-channel">Channel</label>
          <select
            id="analytics-channel"
            value={filters.channel}
            onChange={(e) =>
              setFilters({ ...filters, channel: e.target.value })
            }
          >
            {[
              "all",
              "SEARCH",
              "DIRECT",
              "EXTERNAL",
              "INTERNAL",
              "CAMPAIGN",
              "UNKNOWN",
            ].map((v) => (
              <option key={v} value={v}>
                {v === "all" ? "All channels" : friendly(v)}
              </option>
            ))}
          </select>
        </div>
        <div className="analytics-field">
          <label htmlFor="analytics-type">Content type</label>
          <select
            id="analytics-type"
            value={filters.contentType}
            onChange={(e) =>
              setFilters({ ...filters, contentType: e.target.value })
            }
          >
            {[
              "all",
              "ARTICLE",
              "EVENT",
              "RECIPE",
              "MARKETPLACE_LISTING",
              "STOREFRONT",
              "HELP_WANTED_POST",
              "ORGANIZATION",
            ].map((v) => (
              <option key={v} value={v}>
                {v === "all" ? "All content" : friendly(v)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="analytics-timezone">Time zone</label>
          <select
            id="analytics-timezone"
            value={filters.timezone}
            onChange={(e) =>
              setFilters({ ...filters, timezone: e.target.value })
            }
          >
            {[
              "America/New_York",
              "America/Chicago",
              "America/Denver",
              "America/Los_Angeles",
              "UTC",
            ].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="analytics-exclude-staff">Staff traffic</label>
          <select
            id="analytics-exclude-staff"
            value={String(filters.excludeStaff)}
            onChange={(e) =>
              setFilters({
                ...filters,
                excludeStaff: e.target.value === "true",
              })
            }
          >
            <option value="true">Exclude staff</option>
            <option value="false">Include staff</option>
          </select>
        </div>
        <button
          type="submit"
          className="analytics-button analytics-button-primary"
          disabled={loading}
        >
          <SlidersHorizontal size={15} /> Apply
        </button>
      </form>
      <div className="analytics-actions" style={{ marginBottom: 18 }}>
        {[7, 30, 90].map((days) => (
          <button
            type="button"
            className="analytics-button"
            key={days}
            onClick={() => {
              const next = { ...filters, ...dateRange(days, filters.timezone) };
              setFilters(next);
              apply(next);
            }}
          >
            Last {days} days
          </button>
        ))}
        <div style={{ marginLeft: "auto" }} className="analytics-actions">
          <button
            type="button"
            className="analytics-button"
            disabled={loading}
            onClick={() => setRevision((n) => n + 1)}
            aria-label="Refresh analytics"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            type="button"
            className="analytics-button"
            aria-pressed={auto}
            onClick={() => setAuto(!auto)}
          >
            <Activity size={14} /> Auto-refresh {auto ? "on" : "off"}
          </button>
        </div>
      </div>
      <div
        className="analytics-tabs"
        role="tablist"
        aria-label="Analytics reports"
      >
        {tabs.map(([key, label], i) => (
          <button
            key={key}
            id={`analytics-tab-${key}`}
            type="button"
            role="tab"
            aria-controls="analytics-active-panel"
            aria-selected={tab === key}
            tabIndex={tab === key ? 0 : -1}
            onClick={() => chooseTab(key)}
            onKeyDown={(e) => {
              if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key))
                return;
              e.preventDefault();
              const n =
                e.key === "Home"
                  ? 0
                  : e.key === "End"
                    ? tabs.length - 1
                    : (i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) %
                      tabs.length;
              chooseTab(tabs[n][0]);
              document.getElementById(`analytics-tab-${tabs[n][0]}`)?.focus();
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {error && (
        <div className="analytics-notice analytics-error" role="alert">
          {error}{" "}
          <button
            type="button"
            className="analytics-link"
            onClick={() => setRevision((n) => n + 1)}
          >
            Retry
          </button>
        </div>
      )}
      {loading && (
        <div aria-live="polite" aria-busy="true">
          <span className="analytics-muted">Loading community analytics…</span>
          <div className="analytics-skeleton" />
        </div>
      )}
      {!loading && report && (
        <>
          <div className="analytics-kpis">
            {(
              [
                ["Sessions", "visits"],
                ["Distinct browsers", "visitors"],
                ["Page views", "views"],
                ["Confirmed actions", "actions"],
              ] as const
            ).map(([label, key]) => (
              <div className="analytics-kpi" key={key}>
                <div className="analytics-muted">{label}</div>
                <div className="analytics-number">
                  {number(report.current[key])}
                </div>
                <Delta
                  value={report.current[key]}
                  previous={report.previous[key]}
                />
              </div>
            ))}
          </div>
          {measuredFrom && measuredFrom > report.filters.start && (
            <div className="analytics-notice">
              Available raw history begins {measuredFrom}. Earlier dates and
              comparisons have incomplete coverage.
            </div>
          )}
          {!report.health.events && (
            <div className="analytics-notice">
              No events have been measured in this period. Public-site activity
              will populate these reports as collection runs; no sample figures
              are shown.
            </div>
          )}
          <section
            id="analytics-active-panel"
            role="tabpanel"
            aria-labelledby={`analytics-tab-${tab}`}
          >
            {tab === "overview" && (
              <>
                {analyticsInsights(report).map((insight) => (
                  <div className="analytics-notice" key={insight.title}>
                    <strong>{insight.title}</strong> · {insight.detail}
                  </div>
                ))}

                <Panel
                  title="Audience over time"
                  detail={`${report.filters.start} – ${report.filters.end} · ${report.filters.timezone}`}
                >
                  <Trend report={report} />
                </Panel>
                <div className="analytics-grid">
                  <Panel
                    title="Content bringing people in"
                    detail="Select a title to inspect"
                  >
                    <ContentTable rows={report.content.slice(0, 20)} />
                  </Panel>
                  <Panel
                    title="Where visits come from"
                    detail="Measured session channels"
                  >
                    <Breakdown
                      rows={report.channels}
                      onSelect={(channel) => {
                        const next = { ...applied, channel };
                        setFilters(next);
                        apply(next);
                      }}
                    />
                    <div className="analytics-notice">
                      <strong>{engagement}</strong> of measured sessions were
                      engaged: 10+ active seconds, at least two page views, or a
                      confirmed action.
                    </div>
                  </Panel>
                </div>
              </>
            )}
            {tab === "acquisition" && (
              <>
                <div className="analytics-grid analytics-grid-equal">
                  <Panel title="Channels" detail="Sessions">
                    <Breakdown rows={report.channels} />
                  </Panel>
                  <Panel title="Referral hosts" detail="Sessions">
                    <Breakdown rows={report.referrers} />
                  </Panel>
                  <Panel title="Campaigns" detail="Source / medium / campaign">
                    <Breakdown rows={report.campaigns} />
                  </Panel>
                  <Panel
                    title="Landing pages"
                    detail="First measured page in session"
                  >
                    <Breakdown rows={report.landings} />
                  </Panel>
                </div>
                <div className="analytics-notice">
                  Campaign reporting requires UTM links. Search queries and
                  search-result impressions require an authorized search data
                  integration; referral traffic cannot reveal those keywords.
                </div>
              </>
            )}
            {tab === "audience" && (
              <>
                <div className="analytics-grid analytics-grid-equal">
                  <Panel title="Devices">
                    <Breakdown rows={report.devices} />
                  </Panel>
                  <Panel title="Browsers">
                    <Breakdown rows={report.browsers} />
                  </Panel>
                  <Panel
                    title="Observed-browser retention"
                    detail="Eligible cohorts only"
                  >
                    {report.retention.length ? (
                      report.retention.map((r) => (
                        <div className="analytics-cohort" key={r.week}>
                          <span>
                            Week {r.week}
                            <small
                              className="analytics-muted"
                              style={{ display: "block" }}
                            >
                              {number(r.returned)} returning of{" "}
                              {number(r.eligible)} eligible browsers
                            </small>
                          </span>
                          <strong>{percent(r.returned, r.eligible)}</strong>
                        </div>
                      ))
                    ) : (
                      <Empty text="Retention appears once observed cohorts have enough follow-up time." />
                    )}
                    <p>
                      First observed within available history, not necessarily a
                      first-ever visit. Incomplete weeks are excluded.
                    </p>
                  </Panel>
                  <Panel title="Audience context">
                    <div className="analytics-cohort">
                      <span>Newly observed browsers</span>
                      <strong>{number(report.audience.newlyObserved)}</strong>
                    </div>
                    <div className="analytics-cohort">
                      <span>Seen in the prior period</span>
                      <strong>{number(report.audience.seenPreviously)}</strong>
                    </div>
                    <div className="analytics-number">{engagement}</div>
                    <p>Engaged-session rate</p>
                    <div className="analytics-notice">
                      Browser identifiers estimate audience size. Shared
                      devices, deleted storage, opt-outs and browser blocking
                      affect counts. No fingerprinting or cross-community
                      identity matching.
                    </div>
                    <p>
                      Geography is not collected. No location precision is
                      inferred from a visitor’s content choices.
                    </p>
                  </Panel>
                </div>
              </>
            )}
            {tab === "content" && (
              <>
                <Panel
                  title="Content performance"
                  detail="Top 100 measured records"
                >
                  <ContentTable rows={report.content} />
                </Panel>
                <div className="analytics-grid analytics-grid-equal">
                  <Panel
                    title="Categories"
                    detail="Views / opens within top content"
                  >
                    <Breakdown rows={report.categories} metric="views" />
                  </Panel>
                  <Panel
                    title="Authors"
                    detail="Views / opens within top content"
                  >
                    <Breakdown rows={report.authors} metric="views" />
                  </Panel>
                  <Panel
                    title="Homepage placements"
                    detail="Viewable impressions and clicks"
                  >
                    <div className="analytics-table-wrap">
                      <table className="analytics-table">
                        <thead>
                          <tr>
                            <th>Placement</th>
                            <th>Impressions</th>
                            <th>Clicks</th>
                            <th>CTR</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.slots.map((r) => (
                            <tr key={r.label}>
                              <td>{r.label}</td>
                              <td>{number(r.impressions)}</td>
                              <td>{number(r.clicks)}</td>
                              <td>{percent(r.clicks, r.impressions)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {!report.slots.length && <Empty />}
                  </Panel>
                </div>
              </>
            )}
            {tab === "impact" && (
              <>
                <Panel
                  title="From discovery to participation"
                  detail="Observed actions, with clear evidence"
                >
                  <div className="analytics-table-wrap">
                    <table className="analytics-table">
                      <thead>
                        <tr>
                          <th>Action</th>
                          <th>Evidence</th>
                          <th className="analytics-numeric">Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.outcomes.map((r) => (
                          <tr key={`${r.label}:${r.confirmed}`}>
                            <td>{friendly(r.label)}</td>
                            <td>
                              <span className="analytics-pill">
                                {r.confirmed
                                  ? "Server-confirmed"
                                  : "Browser intent"}
                              </span>
                            </td>
                            <td className="analytics-numeric">
                              {number(r.count)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {!report.outcomes.length && <Empty />}
                </Panel>
                <div className="analytics-notice">
                  Intent does not establish attendance, a completed transaction
                  or community benefit. Confirmed actions come only from
                  instrumented successful server operations; historical events
                  without provenance remain unconfirmed.
                </div>
              </>
            )}
            {tab === "explorer" && (
              <>
                <div className="analytics-grid analytics-grid-equal">
                  <Panel
                    title="Content discovery funnel"
                    detail="Ordered within the selected range"
                  >
                    {report.funnel.map((r, i) => (
                      <div className="analytics-breakdown" key={r.label}>
                        <div className="analytics-breakdown-label">
                          <span>
                            {i + 1}. {r.label}
                          </span>
                          <strong>
                            {number(r.count)} ·{" "}
                            {percent(r.count, report.funnel[0]?.count || 0)}
                          </strong>
                        </div>
                        <div className="analytics-track">
                          <span
                            style={{
                              width:
                                percent(
                                  r.count,
                                  report.funnel[0]?.count || 0,
                                ) === "—"
                                  ? "0%"
                                  : percent(
                                      r.count,
                                      report.funnel[0]?.count || 0,
                                    ),
                            }}
                          />
                        </div>
                      </div>
                    ))}
                    <p>
                      Same-session page view → content open → CTA/share/contact
                      intent. This is a behavior funnel, not confirmed
                      conversion attribution.
                    </p>
                  </Panel>
                  <Panel
                    title="Exit pages"
                    detail="Last observed page, not proof of abandonment"
                  >
                    <Breakdown rows={report.exits} />
                  </Panel>
                </div>
                <div className="analytics-grid">
                  <Panel
                    title="Navigation paths"
                    detail="Consecutive measured page views"
                  >
                    <div className="analytics-table-wrap">
                      <table className="analytics-table">
                        <thead>
                          <tr>
                            <th>From</th>
                            <th>To</th>
                            <th className="analytics-numeric">Transitions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.journeys.map((r) => (
                            <tr key={`${r.from}:${r.to}`}>
                              <td>{r.from}</td>
                              <td style={{ overflowWrap: "anywhere" }}>
                                {r.to}
                              </td>
                              <td className="analytics-numeric">
                                {number(r.count)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {!report.journeys.length && <Empty />}
                  </Panel>
                  <Panel
                    title="Daily data"
                    detail="Accessible chart alternative"
                  >
                    <div className="analytics-table-wrap">
                      <table className="analytics-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Sessions</th>
                            <th>Views</th>
                            <th>Browsers</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.series.map((r) => (
                            <tr key={r.date}>
                              <td>{r.date}</td>
                              <td>{number(r.visits)}</td>
                              <td>{number(r.views)}</td>
                              <td>{number(r.visitors)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Panel>
                </div>
              </>
            )}
            {tab === "health" && (
              <>
                <div className="analytics-grid analytics-grid-equal">
                  <Panel title="Collection health">
                    <dl>
                      {[
                        [
                          "Last received event",
                          report.health.lastEvent
                            ? new Date(report.health.lastEvent).toLocaleString()
                            : "No events",
                        ],
                        ["Events in range", number(report.health.events)],
                        [
                          "Last successful archive / retention",
                          report.health.maintenance
                            ? new Date(
                                report.health.maintenance,
                              ).toLocaleString()
                            : "Not run on this release",
                        ],
                        [
                          "Measured public paths",
                          number(report.health.measuredPages),
                        ],
                        [
                          "Unidentified page views",
                          number(report.health.unidentified),
                        ],
                        ["Legacy events", number(report.health.legacyEvents)],
                        [
                          "Sessions with a page view in last 5 min",
                          number(report.health.live),
                        ],
                      ].map(([k, v]) => (
                        <div className="analytics-cohort" key={k}>
                          <dt>{k}</dt>
                          <dd>{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </Panel>
                  <Panel title="Definitions and safeguards">
                    <p>
                      Private routes and query strings excluded. No form or
                      message bodies, persistent IPs, precise location, or
                      replay.
                    </p>
                    <div className="analytics-notice">
                      Sessions expire after 30 idle minutes. Unique browsers are
                      computed over the whole selected range; daily unique
                      counts are never added to estimate a period audience.
                    </div>
                    <p>
                      Raw-event reports support up to 90 days. Comparisons
                      depend on available history. Legacy events may have
                      different session, impression and engagement definitions.
                    </p>
                    <div className="analytics-notice">
                      Collection is best effort. DNT, privacy controls, blockers
                      and connection failures create unmeasured activity.
                      Per-process throttling is not a distributed abuse limit.
                    </div>
                  </Panel>
                  <Panel
                    title="Field performance"
                    detail="75th percentile · collected samples"
                  >
                    {report.health.vitals.length ? (
                      report.health.vitals.map((r) => (
                        <div className="analytics-cohort" key={r.label}>
                          <span>
                            {r.label} · {number(r.samples)} samples
                          </span>
                          <strong>
                            {r.value.toFixed(2)}
                            {r.label === "CLS" ? "" : " ms"}
                          </strong>
                        </div>
                      ))
                    ) : (
                      <Empty text="Field-performance samples will appear after collection is enabled on this release." />
                    )}
                  </Panel>
                </div>
              </>
            )}
            {tab === "reports" && (
              <>
                <div className="analytics-grid analytics-grid-equal">
                  <Panel
                    title="Saved views"
                    detail="Private to your account and community"
                  >
                    <label htmlFor="analytics-view-name">
                      View name (required)
                    </label>
                    <input
                      id="analytics-view-name"
                      maxLength={60}
                      value={viewName}
                      onChange={(e) => setViewName(e.target.value)}
                      placeholder="Example: mobile readership"
                    />
                    <button
                      style={{ marginTop: 10 }}
                      type="button"
                      className="analytics-button analytics-button-primary"
                      disabled={
                        !viewName.trim() || saving || views.length >= 20
                      }
                      onClick={saveView}
                    >
                      <Save size={14} /> Save current view
                    </button>
                    <p>Saved ranges roll forward as 7, 30, or 90 days.</p>
                    {views.map((v) => (
                      <div className="analytics-cohort" key={v.id}>
                        <button
                          type="button"
                          className="analytics-link"
                          onClick={() => loadView(v)}
                        >
                          {v.name}
                        </button>
                        <button
                          type="button"
                          className="analytics-button"
                          disabled={saving}
                          onClick={() =>
                            void save(views.filter((x) => x.id !== v.id))
                          }
                          aria-label={`Remove saved view ${v.name}`}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    {notice && (
                      <div className="analytics-notice" role="status">
                        {notice}
                      </div>
                    )}
                  </Panel>
                  <Panel title="Share the evidence">
                    <div className="analytics-actions">
                      <a
                        className="analytics-button"
                        href={`/api/admin/analytics/report?${queryString}&format=csv`}
                      >
                        <Download size={15} /> Download CSV
                      </a>
                      <button
                        type="button"
                        className="analytics-button"
                        onClick={() => window.print()}
                      >
                        <Printer size={15} /> Print / save PDF
                      </button>
                    </div>
                    <div className="analytics-notice">
                      Exports use the same access checks and filters as this
                      dashboard. Browser identifiers and individual activity are
                      never exported.
                    </div>
                    <p>
                      Shareable report links require the recipient’s own
                      authorized account.
                    </p>
                    <button
                      type="button"
                      className="analytics-button"
                      style={{ marginTop: 12 }}
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(
                            window.location.href,
                          );
                          setNotice("Report link copied.");
                        } catch {
                          setNotice(
                            "Copy the current URL to share this report.",
                          );
                        }
                      }}
                    >
                      Copy report link
                    </button>
                  </Panel>
                </div>
              </>
            )}
          </section>
          {communities.length > 1 && (
            <Panel
              title="Platform comparison"
              detail="Explicit platform access · up to 200 communities"
            >
              <button
                type="button"
                className="analytics-button"
                onClick={async () => {
                  setNetworkError("");
                  try {
                    const response = await fetch(
                      `/api/admin/analytics/network?${queryString}`,
                      { cache: "no-store" },
                    );
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error);
                    setNetwork(data);
                  } catch (e) {
                    setNetworkError(
                      e instanceof Error ? e.message : "Comparison unavailable",
                    );
                  }
                }}
              >
                Compare communities
              </button>
              {networkError && <p role="alert">{networkError}</p>}
              {network.length > 0 && (
                <div className="analytics-table-wrap">
                  <table className="analytics-table">
                    <thead>
                      <tr>
                        <th>Community</th>
                        <th>Sessions</th>
                        <th>Views</th>
                        <th>Distinct browsers</th>
                        <th>Confirmed actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {network.map((row) => (
                        <tr key={row.id}>
                          <td>
                            <button
                              className="analytics-link"
                              type="button"
                              onClick={() => chooseCommunity(row.id)}
                            >
                              {row.name}
                            </button>
                          </td>
                          <td>{number(row.visits)}</td>
                          <td>{number(row.views)}</td>
                          <td>{number(row.visitors)}</td>
                          <td>{number(row.actions)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p>
                    Browser audiences are distinct within each community and
                    must not be summed into a network-wide unique audience.
                  </p>
                </div>
              )}
            </Panel>
          )}
          <div className="analytics-footer">
            <span>
              <BarChart3 size={12} style={{ display: "inline" }} />{" "}
              {currentName} · Tenant-scoped aggregates ·{" "}
              {report.filters.timezone}
            </span>
            <span>
              Generated {new Date(report.generatedAt).toLocaleTimeString()} ·{" "}
              {auto ? "Refreshes every minute" : "Manual refresh"}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
