"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { Pagination } from "@/components/shared/Pagination";

// ============================================================================
// TYPES
// ============================================================================

interface AuditEntry {
  id: string;
  source: "trust" | "activity" | "login";
  timestamp: string;
  action: string;
  actionRaw: string;
  actor: { id: string; name: string; email: string };
  target: { id: string; name: string; email?: string; type: string } | null;
  details: string | null;
  ipAddress: string | null;
  loginMeta?: {
    provider: string;
    city: string | null;
    region: string | null;
    country: string | null;
    userAgent: string | null;
    isAnomaly: boolean;
    anomalyReason: string | null;
  };
}

interface AuditResponse {
  entries: AuditEntry[];
  pagination: { page: number; limit: number; total: number; pages: number };
  tab: string;
  counts?: { trust: number; activity: number; logins: number };
}

type Tab = "all" | "trust" | "activity" | "logins";

// ============================================================================
// COMPONENT
// ============================================================================

export default function AuditPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [counts, setCounts] = useState<{
    trust: number;
    activity: number;
    logins: number;
  } | null>(null);

  // Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [ipFilter, setIpFilter] = useState("");
  const [anomaliesOnly, setAnomaliesOnly] = useState(false);

  // Expanded row
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchAuditLog = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("tab", tab);
      params.set("page", String(page));
      params.set("limit", "25");
      if (startDate)
        params.set("startDate", new Date(startDate).toISOString());
      if (endDate)
        params.set("endDate", new Date(endDate + "T23:59:59").toISOString());
      if (ipFilter) params.set("ipAddress", ipFilter);
      if (anomaliesOnly && tab === "logins")
        params.set("anomaliesOnly", "true");

      const res = await fetch(`/api/audit?${params.toString()}`);
      if (!res.ok) {
        let errorMsg = `HTTP ${res.status}`;
        try {
          const data = await res.json();
          errorMsg = data.error || errorMsg;
        } catch {
          // Response wasn't JSON
          errorMsg = `HTTP ${res.status}: ${res.statusText}`;
        }
        throw new Error(errorMsg);
      }

      const data: AuditResponse = await res.json();
      setEntries(data.entries);
      setTotalPages(data.pagination.pages);
      setTotalCount(data.pagination.total);
      if (data.counts) setCounts(data.counts);
    } catch (err: any) {
      setError(err.message);
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  }, [tab, page, startDate, endDate, ipFilter, anomaliesOnly]);

  useEffect(() => {
    fetchAuditLog();
  }, [fetchAuditLog]);

  const handleTabChange = (newTab: Tab) => {
    setTab(newTab);
    setPage(1);
    setExpandedId(null);
  };

  const handleFilterReset = () => {
    setStartDate("");
    setEndDate("");
    setIpFilter("");
    setAnomaliesOnly(false);
    setPage(1);
  };

  // ============================================================================
  // RENDERING HELPERS
  // ============================================================================

  const getSourceBadge = (source: string) => {
    switch (source) {
      case "trust":
        return (
          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-700">
            Trust
          </span>
        );
      case "activity":
        return (
          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
            Activity
          </span>
        );
      case "login":
        return (
          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">
            Login
          </span>
        );
      default:
        return null;
    }
  };

  const getActionColor = (entry: AuditEntry) => {
    const { actionRaw, source } = entry;

    if (actionRaw === "ANOMALY_LOGIN") return "bg-red-600 text-white";

    if (source === "trust") {
      if (["BANNED", "TRUST_REVOKED", "SUSPENDED"].includes(actionRaw))
        return "bg-red-600 text-white";
      if (["TRUST_GRANTED", "REINSTATED", "UNBANNED"].includes(actionRaw))
        return "bg-green-600 text-white";
      return "bg-yellow-500 text-white";
    }

    if (source === "activity") {
      if (actionRaw === "CREATE") return "bg-green-600 text-white";
      if (actionRaw === "DELETE") return "bg-red-600 text-white";
      if (["UPDATE", "PUBLISH", "UNPUBLISH"].includes(actionRaw))
        return "bg-yellow-500 text-white";
      if (actionRaw === "APPROVE") return "bg-blue-600 text-white";
      if (["REJECT", "FLAG"].includes(actionRaw))
        return "bg-red-500 text-white";
      if (actionRaw === "SEND_MESSAGE") return "bg-indigo-500 text-white";
      return "bg-gray-500 text-white";
    }

    return "bg-gray-500 text-white";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // ============================================================================
  // JSX
  // ============================================================================

  return (
    <div>
      <h1 className="text-4xl font-bold mb-2 text-[#46A8CC]">Audit Log</h1>
      <p className="text-gray-500 mb-6">
        Security events, trust actions, and content activity across the
        platform.
      </p>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {(
          [
            { key: "all", label: "All", count: totalCount },
            { key: "trust", label: "Trust", count: counts?.trust },
            { key: "activity", label: "Activity", count: counts?.activity },
            { key: "logins", label: "Logins", count: counts?.logins },
          ] as { key: Tab; label: string; count?: number }[]
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => handleTabChange(t.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-gray-200 text-gray-600">
                {t.count.toLocaleString()}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div>
            <label
              htmlFor="startDate"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              From
            </label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
            />
          </div>

          <div>
            <label
              htmlFor="endDate"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              To
            </label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
            />
          </div>

          <div>
            <label
              htmlFor="ipFilter"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              IP Address
            </label>
            <input
              type="text"
              id="ipFilter"
              placeholder="e.g., 192.168.1.1"
              value={ipFilter}
              onChange={(e) => {
                setIpFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
            />
          </div>

          {tab === "logins" && (
            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                id="anomaliesOnly"
                checked={anomaliesOnly}
                onChange={(e) => {
                  setAnomaliesOnly(e.target.checked);
                  setPage(1);
                }}
                className="w-4 h-4 rounded border-gray-300 text-[#A51E30] focus:ring-[#A51E30]"
              />
              <label
                htmlFor="anomaliesOnly"
                className="text-sm font-medium text-red-700"
              >
                Anomalies only
              </label>
            </div>
          )}

          <div>
            <button
              onClick={handleFilterReset}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          <p className="font-medium">{error}</p>
          {(error.includes("500") || error.includes("Failed")) && (
            <p className="text-sm mt-1 text-red-600">
              If you recently updated the database schema, try restarting the dev server (stop and re-run <code className="bg-red-100 px-1 rounded">npm run dev</code>).
            </p>
          )}
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="inline-block h-8 w-8 border-4 border-[#46A8CC] border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-gray-500">Loading audit log...</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-lg mb-1">No entries found</p>
          <p className="text-gray-400 text-sm">
            Try adjusting your filters or switching tabs.
          </p>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Timestamp
                    </th>
                    {tab === "all" && (
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Source
                      </th>
                    )}
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Actor
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Target
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      IP Address
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {entries.map((entry) => (
                    <Fragment key={entry.id}>
                      <tr
                        className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                          entry.loginMeta?.isAnomaly
                            ? "bg-red-50 hover:bg-red-100"
                            : ""
                        }`}
                        onClick={() =>
                          setExpandedId(
                            expandedId === entry.id ? null : entry.id
                          )
                        }
                      >
                        <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">
                          {formatDate(entry.timestamp)}
                        </td>
                        {tab === "all" && (
                          <td className="px-5 py-3">
                            {getSourceBadge(entry.source)}
                          </td>
                        )}
                        <td className="px-5 py-3">
                          <span
                            className={`inline-block px-2.5 py-1 text-xs font-semibold rounded ${getActionColor(
                              entry
                            )}`}
                          >
                            {entry.action}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="text-sm font-medium text-gray-900">
                            {entry.actor.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {entry.actor.email}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          {entry.target ? (
                            <div>
                              <div className="text-sm text-gray-900">
                                {entry.target.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                ({entry.target.type})
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-xs text-gray-600 font-mono">
                          {entry.ipAddress || (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-600 max-w-xs truncate">
                          {entry.details || (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>

                      {/* Expanded detail row */}
                      {expandedId === entry.id && (
                        <tr>
                          <td
                            colSpan={tab === "all" ? 7 : 6}
                            className="px-5 py-4 bg-gray-50"
                          >
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="font-medium text-gray-700">
                                  Entry ID:
                                </span>
                                <p className="text-gray-500 font-mono text-xs mt-0.5">
                                  {entry.id}
                                </p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">
                                  Source:
                                </span>
                                <p className="text-gray-500 mt-0.5 capitalize">
                                  {entry.source}
                                </p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">
                                  Raw Action:
                                </span>
                                <p className="text-gray-500 font-mono text-xs mt-0.5">
                                  {entry.actionRaw}
                                </p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">
                                  Actor ID:
                                </span>
                                <p className="text-gray-500 font-mono text-xs mt-0.5">
                                  {entry.actor.id}
                                </p>
                              </div>
                              {entry.ipAddress && (
                                <div>
                                  <span className="font-medium text-gray-700">
                                    IP Address:
                                  </span>
                                  <p className="text-gray-500 font-mono text-xs mt-0.5">
                                    {entry.ipAddress}
                                  </p>
                                </div>
                              )}
                              {entry.loginMeta && (
                                <>
                                  <div>
                                    <span className="font-medium text-gray-700">
                                      Auth Provider:
                                    </span>
                                    <p className="text-gray-500 mt-0.5 capitalize">
                                      {entry.loginMeta.provider}
                                    </p>
                                  </div>
                                  {entry.loginMeta.city && (
                                    <div>
                                      <span className="font-medium text-gray-700">
                                        Location:
                                      </span>
                                      <p className="text-gray-500 mt-0.5">
                                        {entry.loginMeta.city},{" "}
                                        {entry.loginMeta.region},{" "}
                                        {entry.loginMeta.country}
                                      </p>
                                    </div>
                                  )}
                                  {entry.loginMeta.userAgent && (
                                    <div className="col-span-2">
                                      <span className="font-medium text-gray-700">
                                        User Agent:
                                      </span>
                                      <p className="text-gray-500 text-xs mt-0.5 break-all">
                                        {entry.loginMeta.userAgent}
                                      </p>
                                    </div>
                                  )}
                                  {entry.loginMeta.isAnomaly &&
                                    entry.loginMeta.anomalyReason && (
                                      <div className="col-span-2 md:col-span-4">
                                        <span className="font-medium text-red-700">
                                          Anomaly Alert:
                                        </span>
                                        <p className="text-red-600 mt-0.5">
                                          {entry.loginMeta.anomalyReason}
                                        </p>
                                      </div>
                                    )}
                                </>
                              )}
                              {entry.details && (
                                <div className="col-span-2 md:col-span-4">
                                  <span className="font-medium text-gray-700">
                                    Full Details:
                                  </span>
                                  <p className="text-gray-500 mt-0.5">
                                    {entry.details}
                                  </p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}

          {/* Summary */}
          <p className="text-center text-sm text-gray-400 mt-4">
            Showing {entries.length} of {totalCount.toLocaleString()} entries
          </p>
        </>
      )}
    </div>
  );
}
