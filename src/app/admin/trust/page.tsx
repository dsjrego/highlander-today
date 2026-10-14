"use client";

import { ShieldOff } from 'lucide-react';
import { AdminSummary } from '@/components/admin/AdminSummary';
import { AdminSection } from '@/components/admin/AdminSection';
import { AdminTable } from '@/components/admin/AdminTable';
import { AdminChip } from '@/components/admin/AdminChip';
import { AdminPage } from '@/components/admin/AdminPage';
import { CrudActionButton } from '@/components/shared/CrudAction';

import { useState, useEffect, useCallback } from "react";
import ConfirmDialog from "@/components/shared/ConfirmDialog";

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
  const [revokeDialog, setRevokeDialog] = useState<{ userId: string; userName: string } | null>(null);

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

  const handleRevoke = async (userId: string) => {
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
      setRevokeDialog(null);
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

  return (
    <AdminPage title="Trust management">

      {/* Messages */}
      {successMsg && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg text-sm">{successMsg}</div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      <AdminSummary label="Trust summary" items={[
        { label: 'Vouches', value: stats.totalVouches.toLocaleString() },
        { label: 'Trusted users', value: userStats?.trustedCount ?? '…' },
        { label: 'Awaiting vouch', value: userStats?.registeredCount ?? '…' },
        { label: 'Suspended', value: userStats?.suspendedCount ?? '…' },
      ]} />

      <AdminSection title="Vouching network" count={graphNodes.length}>
        <AdminTable label="Vouching network" rows={graphLoading ? [] : graphNodes} rowKey={(node) => node.id}
          emptyMessage={graphLoading ? 'Loading network…' : 'No vouching relationships yet.'}
          columns={[
            { key: 'name', label: 'Person', render: (node) => node.name },
            { key: 'trust', label: 'Trust', render: (node) => <AdminChip tone={node.trustLevel === 'TRUSTED' ? 'ok' : node.trustLevel === 'SUSPENDED' ? 'bad' : 'neu'}>{node.trustLevel.replace(/_/g, ' ')}</AdminChip> },
            { key: 'given', label: 'Given', align: 'right', render: (node) => graphEdges.filter((edge) => edge.from === node.id).length },
            { key: 'received', label: 'Received', align: 'right', render: (node) => graphEdges.filter((edge) => edge.to === node.id).length },
          ]} />
      </AdminSection>

      {/* Search */}
      <label className="admin-list-filter">
        <span className="admin-list-filter-label">Voucher or recipient name/email</span>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Voucher or recipient name/email"
          className="admin-list-filter-input"
        />
      </label>

      {/* Vouches Table */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-[var(--brand-primary)] border-t-transparent rounded-full mb-4"></div>
          <p>Loading vouches...</p>
        </div>
      ) : vouches.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          No vouch records found.
        </div>
      ) : (
        <div className="admin-list">
          <div className="admin-list-table-wrap">
            <table className="admin-list-table">
              <thead className="admin-list-head">
                <tr>
                  <th className="admin-list-header-cell">Voucher</th>
                  <th className="admin-list-header-cell">Recipient</th>
                  <th className="admin-list-header-cell">Date</th>
                  <th className="admin-list-header-cell">Status</th>
                  <th className="admin-list-header-cell">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vouches.map((vouch) => (
                  <tr key={vouch.id} className="admin-list-row">
                    <td className="admin-list-cell">
                      <div>
                        <p className="font-semibold text-sm">{vouch.voucherName}</p>
                        <p className="text-xs text-gray-500">{vouch.voucherEmail}</p>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${getTrustColor(vouch.voucherTrustLevel)}`}>
                          {vouch.voucherTrustLevel}
                        </span>
                      </div>
                    </td>
                    <td className="admin-list-cell">
                      <div>
                        <p className="font-semibold text-sm">{vouch.recipientName}</p>
                        <p className="text-xs text-gray-500">{vouch.recipientEmail}</p>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${getTrustColor(vouch.recipientTrustLevel)}`}>
                          {vouch.recipientTrustLevel}
                        </span>
                      </div>
                    </td>
                    <td className="admin-list-cell text-xs text-gray-500">
                      {new Date(vouch.createdAt).toLocaleDateString()}
                    </td>
                    <td className="admin-list-cell">
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
                    <td className="admin-list-cell text-xs">
                      {vouch.recipientTrustLevel === "TRUSTED" && (
                        <CrudActionButton
                          variant="inline-danger" icon={ShieldOff} label="Revoke trust"
                          onClick={() => setRevokeDialog({ userId: vouch.recipientId, userName: vouch.recipientName })}
                          disabled={actionLoading === vouch.recipientId}

                        >
                          {actionLoading === vouch.recipientId ? "..." : "Revoke"}
                        </CrudActionButton>
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

      {revokeDialog ? (
        <ConfirmDialog
          title={`Revoke trust for ${revokeDialog.userName}?`}
          description="This will revoke the current trusted user and cascade-suspend the users they vouched for."
          confirmLabel="Revoke trust"
          isSubmitting={actionLoading === revokeDialog.userId}
          onCancel={() => setRevokeDialog(null)}
          onConfirm={async () => {
            await handleRevoke(revokeDialog.userId);
          }}
        />
      ) : null}
    </AdminPage>
  );
}
