"use client";

import { useState, useEffect, useCallback } from "react";

interface BannedAccount {
  id: string;
  email: string;
  userId: string | null;
  firstName: string | null;
  lastName: string | null;
  bannedAt: string;
  bannedBy: string;
  bannedByUserId: string;
  reason: string | null;
  unbannedAt: string | null;
  unbannedBy: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function BansPage() {
  const [bans, setBans] = useState<BannedAccount[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1, limit: 25, total: 0, totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [unbanningId, setUnbanningId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchBans = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "25");
      if (searchTerm) params.set("search", searchTerm);

      const res = await fetch(`/api/admin/bans?${params}`);
      if (!res.ok) throw new Error("Failed to fetch bans");
      const data = await res.json();
      setBans(data.bans);
      setPagination(data.pagination);
    } catch (err: any) {
      setError(err.message || "Failed to fetch bans");
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    const debounce = setTimeout(() => fetchBans(1), 300);
    return () => clearTimeout(debounce);
  }, [fetchBans]);

  const handleUnban = async (ban: BannedAccount) => {
    if (!ban.userId) {
      setError("Cannot unban: no user account associated with this email");
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/trust/unban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: ban.userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to unban user");
      setSuccessMsg(data.message || `${ban.email} has been unbanned`);
      setUnbanningId(null);
      fetchBans(pagination.page);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8 text-[var(--brand-primary)]">Banned Accounts</h1>

      {/* Messages */}
      {successMsg && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg text-sm">{successMsg}</div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <p className="text-gray-600 text-sm mb-2">Active Bans</p>
          <p className="text-3xl font-bold text-red-600">{pagination.total}</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <p className="text-gray-600 text-sm mb-2">Tip</p>
          <p className="text-sm text-gray-500">
            Banned emails prevent re-registration. Unbanning a user restores them to REGISTERED status — they must be re-vouched to become TRUSTED again.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by email..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
        />
      </div>

      {/* Bans Table */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-[var(--brand-primary)] border-t-transparent rounded-full mb-4"></div>
          <p>Loading banned accounts...</p>
        </div>
      ) : bans.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          {searchTerm ? "No banned accounts matching your search." : "No active bans. The community is in good standing!"}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase text-gray-600">User</th>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase text-gray-600">Email</th>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase text-gray-600">Reason</th>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase text-gray-600">Banned</th>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase text-gray-600">Banned By</th>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bans.map((ban) => (
                  <>
                    <tr key={ban.id} className="border-b hover:bg-gray-50">
                      <td className="px-5 py-3 font-semibold text-sm">
                        {ban.firstName && ban.lastName
                          ? `${ban.firstName} ${ban.lastName}`
                          : <span className="text-gray-400 italic">No account</span>}
                      </td>
                      <td className="px-5 py-3 text-sm">{ban.email}</td>
                      <td className="px-5 py-3 text-sm text-gray-600 max-w-xs truncate">
                        {ban.reason || <span className="text-gray-400">No reason recorded</span>}
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500">
                        {new Date(ban.bannedAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600">{ban.bannedBy}</td>
                      <td className="px-5 py-3">
                        {unbanningId === ban.id ? null : (
                          <button
                            onClick={() => setUnbanningId(ban.id)}
                            className="!px-3 !py-1 text-xs font-medium text-white rounded bg-green-600 hover:bg-green-700"
                          >
                            Unban
                          </button>
                        )}
                      </td>
                    </tr>
                    {unbanningId === ban.id && (
                      <tr key={`${ban.id}-confirm`} className="bg-green-50 border-b">
                        <td colSpan={6} className="px-5 py-3">
                          <div className="flex items-center gap-4">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                Confirm unbanning {ban.email}?
                              </p>
                              <p className="text-xs text-gray-600 mt-1">
                                This user will be set to REGISTERED and their email will be removed from the ban list.
                                They will need to be re-vouched to regain TRUSTED status.
                              </p>
                            </div>
                            <div className="flex gap-2 ml-auto flex-shrink-0">
                              <button
                                onClick={() => setUnbanningId(null)}
                                className="!px-4 !py-2 border border-gray-300 rounded-lg hover:bg-gray-100 text-sm font-medium"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleUnban(ban)}
                                disabled={actionLoading}
                                className="!px-4 !py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50"
                              >
                                {actionLoading ? "Unbanning..." : "Confirm Unban"}
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
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
                {pagination.total} bans
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchBans(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="!px-3 !py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-xs text-gray-600 flex items-center">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => fetchBans(pagination.page + 1)}
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
