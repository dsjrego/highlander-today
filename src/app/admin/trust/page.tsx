"use client";

import { useState, useEffect, useCallback } from "react";

interface VouchRecord {
  id: string;
  voucherId: string;
  voucherName: string;
  voucherEmail: string;
  voucherTrustLevel: string;
  recipientId: string;
  recipientName: string;
  recipientEmail: string;
  recipientTrustLevel: string;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface GraphNode {
  id: string;
  name: string;
  trustLevel: string;
  profilePhotoUrl: string | null;
  type?: string;
}

interface GraphEdge {
  from: string;
  to: string;
  type: string;
  createdAt: string;
}

export default function TrustManagementPage() {
  const [vouches, setVouches] = useState<VouchRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1, limit: 25, total: 0, totalPages: 0,
  });
  const [stats, setStats] = useState<{ totalVouches: number }>({ totalVouches: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Graph state
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([]);
  const [graphLoading, setGraphLoading] = useState(false);

  // Trust stats from users
  const [userStats, setUserStats] = useState<{
    totalUsers: number;
    trustedCount: number;
    registeredCount: number;
    suspendedCount: number;
  } | null>(null);

  const fetchVouches = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "25");
      if (searchTerm) params.set("search", searchTerm);

      const res = await fetch(`/api/admin/vouches?${params}`);
      if (!res.ok) throw new Error("Failed to fetch vouches");
      const data = await res.json();
      setVouches(data.vouches);
      setPagination(data.pagination);
      setStats(data.stats);
    } catch (err: any) {
      setError(err.message || "Failed to fetch vouches");
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm]);

  const fetchGraph = useCallback(async () => {
    setGraphLoading(true);
    try {
      const res = await fetch("/api/trust/graph");
      if (!res.ok) throw new Error("Failed to fetch trust graph");
      const data = await res.json();
      setGraphNodes(data.nodes || []);
      setGraphEdges(data.edges || []);
    } catch (err: any) {
      console.error("Graph fetch error:", err);
    } finally {
      setGraphLoading(false);
    }
  }, []);

  const fetchUserStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users?limit=1");
      if (!res.ok) return;
      const data = await res.json();
      setUserStats(data.stats);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => fetchVouches(1), 300);
    return () => clearTimeout(debounce);
  }, [fetchVouches]);

  useEffect(() => {
    fetchGraph();
    fetchUserStats();
  }, [fetchGraph, fetchUserStats]);

  const handleRevoke = async (userId: string, userName: string) => {
    if (!confirm(`Revoke trust for ${userName}? This will cascade-suspend all users they vouched for.`)) return;
    setActionLoading(userId);
    setError(null);
    try {
      const res = await fetch("/api/trust/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, reason: "Trust revoked via admin panel" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to revoke trust");
      setSuccessMsg(data.message + (data.cascadeSuspended > 0 ? ` (${data.cascadeSuspended} cascade suspensions)` : ""));
      fetchVouches(pagination.page);
      fetchGraph();
      fetchUserStats();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const getTrustColor = (level: string) => {
    switch (level) {
      case "TRUSTED": return "text-green-700 bg-green-100";
      case "REGISTERED": return "text-blue-700 bg-blue-100";
      case "SUSPENDED": return "text-red-700 bg-red-100";
      default: return "text-gray-700 bg-gray-100";
    }
  };

  const getNodeColor = (trustLevel: string) => {
    switch (trustLevel) {
      case "TRUSTED": return "#22c55e";
      case "REGISTERED": return "#3b82f6";
      case "SUSPENDED": return "#ef4444";
      default: return "#9ca3af";
    }
  };

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8 text-[#46A8CC]">Trust Management</h1>

      {/* Messages */}
      {successMsg && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg text-sm">{successMsg}</div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-lg border border-gray-200">
          <p className="text-gray-600 text-xs mb-1">Total Vouches</p>
          <p className="text-2xl font-bold text-[#46A8CC]">{stats.totalVouches}</p>
        </div>
        <div className="bg-white p-5 rounded-lg border border-gray-200">
          <p className="text-gray-600 text-xs mb-1">Trusted Users</p>
          <p className="text-2xl font-bold text-green-600">{userStats?.trustedCount ?? "..."}</p>
        </div>
        <div className="bg-white p-5 rounded-lg border border-gray-200">
          <p className="text-gray-600 text-xs mb-1">Awaiting Vouch</p>
          <p className="text-2xl font-bold text-blue-600">{userStats?.registeredCount ?? "..."}</p>
        </div>
        <div className="bg-white p-5 rounded-lg border border-gray-200">
          <p className="text-gray-600 text-xs mb-1">Suspended</p>
          <p className="text-2xl font-bold text-red-600">{userStats?.suspendedCount ?? "..."}</p>
        </div>
      </div>

      {/* Vouching Graph */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
        <h3 className="font-bold text-lg mb-4">Vouching Network</h3>
        {graphLoading ? (
          <div className="text-center py-8 text-gray-500">Loading graph...</div>
        ) : graphNodes.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            No vouching relationships yet. The graph will appear once users start vouching for each other.
          </div>
        ) : (
          <div>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-xs text-gray-500">{graphNodes.length} users in network, {graphEdges.length} connections</span>
              <span className="mx-2 text-gray-300">|</span>
              <span className="flex items-center gap-1 text-xs">
                <span className="inline-block w-3 h-3 rounded-full bg-green-500"></span> Trusted
              </span>
              <span className="flex items-center gap-1 text-xs">
                <span className="inline-block w-3 h-3 rounded-full bg-blue-500"></span> Registered
              </span>
              <span className="flex items-center gap-1 text-xs">
                <span className="inline-block w-3 h-3 rounded-full bg-red-500"></span> Suspended
              </span>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-x-auto">
              <div className="flex flex-wrap gap-3">
                {graphNodes.map((node) => (
                  <div
                    key={node.id}
                    className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-sm border border-gray-100"
                  >
                    <span
                      className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getNodeColor(node.trustLevel) }}
                    ></span>
                    <span className="text-xs font-medium">{node.name}</span>
                    <span className="text-[10px] text-gray-400">
                      ({graphEdges.filter(e => e.from === node.id).length} given,{" "}
                      {graphEdges.filter(e => e.to === node.id).length} recv)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by voucher or recipient name/email..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
        />
      </div>

      {/* Vouches Table */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-[#46A8CC] border-t-transparent rounded-full mb-4"></div>
          <p>Loading vouches...</p>
        </div>
      ) : vouches.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          No vouch records found.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase text-gray-600">Voucher</th>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase text-gray-600">Recipient</th>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase text-gray-600">Date</th>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase text-gray-600">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vouches.map((vouch) => (
                  <tr key={vouch.id} className="border-b hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <div>
                        <p className="font-semibold text-sm">{vouch.voucherName}</p>
                        <p className="text-xs text-gray-500">{vouch.voucherEmail}</p>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${getTrustColor(vouch.voucherTrustLevel)}`}>
                          {vouch.voucherTrustLevel}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div>
                        <p className="font-semibold text-sm">{vouch.recipientName}</p>
                        <p className="text-xs text-gray-500">{vouch.recipientEmail}</p>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${getTrustColor(vouch.recipientTrustLevel)}`}>
                          {vouch.recipientTrustLevel}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {new Date(vouch.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3">
                      {vouch.recipientTrustLevel === "TRUSTED" ? (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold text-green-700 bg-green-100">
                          Active
                        </span>
                      ) : vouch.recipientTrustLevel === "SUSPENDED" ? (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold text-red-700 bg-red-100">
                          Revoked
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold text-gray-700 bg-gray-100">
                          {vouch.recipientTrustLevel}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs">
                      {vouch.recipientTrustLevel === "TRUSTED" && (
                        <button
                          onClick={() => handleRevoke(vouch.recipientId, vouch.recipientName)}
                          disabled={actionLoading === vouch.recipientId}
                          className="!px-3 !py-1 text-xs font-medium text-white rounded bg-red-600 hover:bg-red-700 disabled:opacity-50"
                        >
                          {actionLoading === vouch.recipientId ? "..." : "Revoke"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Showing {(pagination.page - 1) * pagination.limit + 1}–
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                {pagination.total} vouches
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchVouches(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="!px-3 !py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-xs text-gray-600 flex items-center">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => fetchVouches(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="!px-3 !py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
