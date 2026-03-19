"use client";

import { useState, useEffect, useCallback } from "react";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  trustLevel: "ANONYMOUS" | "REGISTERED" | "TRUSTED" | "SUSPENDED";
  role: string;
  communityId: string | null;
  profilePhotoUrl: string | null;
  isIdentityLocked: boolean;
  createdAt: string;
  postCount: number;
  vouchesGiven: number;
  vouchesReceived: number;
}

interface Stats {
  totalUsers: number;
  trustedCount: number;
  registeredCount: number;
  suspendedCount: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const ROLES = ["READER", "CONTRIBUTOR", "STAFF_WRITER", "EDITOR", "ADMIN", "SUPER_ADMIN"];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1, limit: 25, total: 0, totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTrust, setFilterTrust] = useState("all");
  const [filterRole, setFilterRole] = useState("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchUsers = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "25");
      if (searchTerm) params.set("search", searchTerm);
      if (filterTrust !== "all") params.set("trustLevel", filterTrust);
      if (filterRole !== "all") params.set("role", filterRole);

      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data.users);
      setPagination(data.pagination);
      setStats(data.stats);
    } catch (err: any) {
      setError(err.message || "Failed to fetch users");
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, filterTrust, filterRole]);

  useEffect(() => {
    const debounce = setTimeout(() => fetchUsers(1), 300);
    return () => clearTimeout(debounce);
  }, [fetchUsers]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setActionLoading(userId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update role");
      setSuccessMsg(`Role updated to ${newRole}`);
      setEditingRole(null);
      fetchUsers(pagination.page);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleVouch = async (userId: string) => {
    setActionLoading(userId);
    setError(null);
    try {
      const res = await fetch(`/api/users/${userId}/vouch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to vouch for user");
      setSuccessMsg(data.message || "Vouch successful");
      setExpandedUser(null);
      fetchUsers(pagination.page);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleTrustAction = async (
    userId: string,
    action: "ban" | "revoke" | "reinstate",
    reason?: string
  ) => {
    setActionLoading(userId);
    setError(null);
    try {
      let url = "";
      let body: any = { userId };

      switch (action) {
        case "ban":
          url = "/api/trust/ban";
          body.reason = reason || "Banned by admin";
          break;
        case "revoke":
          url = "/api/trust/revoke";
          body.reason = reason || "Trust revoked by admin";
          break;
        case "reinstate":
          url = "/api/trust/reinstate";
          body.trustLevel = "TRUSTED";
          break;
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to ${action} user`);
      setSuccessMsg(data.message || `User ${action} successful`);
      setExpandedUser(null);
      fetchUsers(pagination.page);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    const confirmation = prompt(
      `PERMANENTLY DELETE "${userName}"?\n\nThis will delete all their articles, comments, events, marketplace listings, vouch records, messages, and audit logs.\n\nType "DELETE" to confirm:`
    );
    if (confirmation !== "DELETE") return;

    setActionLoading(userId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete user");
      setSuccessMsg(data.message || "User deleted");
      setExpandedUser(null);
      fetchUsers(pagination.page);
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

  const getRoleColor = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN": return "text-white bg-[#A51E30]";
      case "ADMIN": return "text-white bg-red-600";
      case "EDITOR": return "text-white bg-amber-600";
      case "STAFF_WRITER": return "text-white bg-purple-600";
      case "CONTRIBUTOR": return "text-white bg-blue-600";
      default: return "text-gray-700 bg-gray-200";
    }
  };

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8 text-[#46A8CC]">User Management</h1>

      {/* Success / Error Messages */}
      {successMsg && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg text-sm">
          {successMsg}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-gray-600 text-xs mb-1">Total Users</p>
            <p className="text-2xl font-bold text-[#46A8CC]">{stats.totalUsers}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-gray-600 text-xs mb-1">Trusted</p>
            <p className="text-2xl font-bold text-green-600">{stats.trustedCount}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-gray-600 text-xs mb-1">Registered</p>
            <p className="text-2xl font-bold text-blue-600">{stats.registeredCount}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-gray-600 text-xs mb-1">Suspended</p>
            <p className="text-2xl font-bold text-red-600">{stats.suspendedCount}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6 flex flex-wrap gap-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name or email..."
          className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
        />
        <select
          value={filterTrust}
          onChange={(e) => setFilterTrust(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
        >
          <option value="all">All Trust Levels</option>
          <option value="TRUSTED">Trusted</option>
          <option value="REGISTERED">Registered</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="ANONYMOUS">Anonymous</option>
        </select>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
        >
          <option value="all">All Roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>

      {/* Users Table */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-[#46A8CC] border-t-transparent rounded-full mb-4"></div>
          <p>Loading users...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          No users found matching your filters.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-600">User</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-600">Trust</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-600">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-600">Joined</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-600">Posts</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-600">Vouches</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <>
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <a
                            href={`/profile/${user.id}`}
                            className="font-semibold text-sm text-[#46A8CC] hover:underline"
                          >
                            {user.firstName} {user.lastName}
                            {user.isIdentityLocked && (
                              <span className="ml-1 text-xs text-gray-400" title="Identity locked">&#128274;</span>
                            )}
                          </a>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getTrustColor(user.trustLevel)}`}>
                          {user.trustLevel}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {editingRole === user.id ? (
                          <select
                            defaultValue={user.role}
                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                            onBlur={() => setEditingRole(null)}
                            autoFocus
                            disabled={actionLoading === user.id}
                            className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#46A8CC]"
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold cursor-pointer ${getRoleColor(user.role)}`}
                            onClick={() => setEditingRole(user.id)}
                            title="Click to change role"
                          >
                            {user.role.replace(/_/g, " ")}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm">{user.postCount}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        <span title="Given">{user.vouchesGiven} given</span>
                        <span className="mx-1 text-gray-300">/</span>
                        <span title="Received">{user.vouchesReceived} recv</span>
                      </td>
                      <td className="px-4 py-3 text-xs space-x-1">
                        <button
                          onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                          className="!p-0 text-[#46A8CC] hover:underline"
                        >
                          {expandedUser === user.id ? "Close" : "Actions"}
                        </button>
                      </td>
                    </tr>
                    {expandedUser === user.id && (
                      <tr key={`${user.id}-actions`} className="bg-gray-50 border-b">
                        <td colSpan={7} className="px-4 py-3">
                          <div className="flex flex-wrap gap-2 items-center">
                            <span className="text-xs text-gray-500 mr-2">
                              {user.firstName} {user.lastName}:
                            </span>
                            <a
                              href={`/profile/${user.id}`}
                              className="!px-3 !py-1 text-xs font-medium text-white rounded bg-[#46A8CC] hover:bg-[#3a8fb0]"
                            >
                              View Profile
                            </a>
                            {user.trustLevel === "REGISTERED" && (
                              <button
                                onClick={() => handleVouch(user.id)}
                                disabled={actionLoading === user.id}
                                className="!px-3 !py-1 text-xs font-medium text-white rounded bg-green-600 hover:bg-green-700 disabled:opacity-50"
                              >
                                {actionLoading === user.id ? "..." : "Vouch for User"}
                              </button>
                            )}
                            {user.trustLevel === "TRUSTED" && (
                              <button
                                onClick={() => handleTrustAction(user.id, "revoke")}
                                disabled={actionLoading === user.id}
                                className="!px-3 !py-1 text-xs font-medium text-white rounded bg-orange-600 hover:bg-orange-700 disabled:opacity-50"
                              >
                                {actionLoading === user.id ? "..." : "Revoke Trust"}
                              </button>
                            )}
                            {user.trustLevel === "SUSPENDED" && (
                              <button
                                onClick={() => handleTrustAction(user.id, "reinstate")}
                                disabled={actionLoading === user.id}
                                className="!px-3 !py-1 text-xs font-medium text-white rounded bg-green-600 hover:bg-green-700 disabled:opacity-50"
                              >
                                {actionLoading === user.id ? "..." : "Reinstate"}
                              </button>
                            )}
                            {user.trustLevel !== "SUSPENDED" && (
                              <button
                                onClick={() => {
                                  const reason = prompt("Ban reason:");
                                  if (reason) handleTrustAction(user.id, "ban", reason);
                                }}
                                disabled={actionLoading === user.id}
                                className="!px-3 !py-1 text-xs font-medium text-white rounded bg-red-600 hover:bg-red-700 disabled:opacity-50"
                              >
                                {actionLoading === user.id ? "..." : "Ban User"}
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteUser(user.id, `${user.firstName} ${user.lastName}`)}
                              disabled={actionLoading === user.id}
                              className="!px-3 !py-1 text-xs font-medium text-white rounded bg-red-900 hover:bg-red-950 disabled:opacity-50"
                            >
                              {actionLoading === user.id ? "..." : "Delete User"}
                            </button>
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
                {pagination.total} users
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchUsers(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="!px-3 !py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-xs text-gray-600 flex items-center">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => fetchUsers(pagination.page + 1)}
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
