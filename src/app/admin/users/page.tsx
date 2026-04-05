'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import {
  Eye,
  MessageSquare,
  Settings2,
  ShieldCheck,
  ShieldMinus,
  ShieldPlus,
  ShieldX,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { CrudActionButton, CrudActionLink } from '@/components/shared/CrudAction';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  trustLevel: 'ANONYMOUS' | 'REGISTERED' | 'TRUSTED' | 'SUSPENDED';
  role: string;
  isIdentityLocked: boolean;
  lastSeenAt: string | null;
  postCount: number;
  vouchedBy: string[];
  vouchesGiven: number;
  vouchesReceived: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const ROLES = ['READER', 'CONTRIBUTOR', 'STAFF_WRITER', 'EDITOR', 'ADMIN', 'SUPER_ADMIN'];

type MessageDialogState = {
  userId: string;
  userName: string;
} | null;

function formatRoleLabel(role: string) {
  return role.replace(/_/g, ' ');
}

function formatDateTime(value: string | null) {
  if (!value) {
    return 'Never';
  }

  return new Date(value).toLocaleString();
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function MessageUserDialog({
  userName,
  value,
  error,
  isLoading,
  onChange,
  onCancel,
  onSubmit,
}: {
  userName: string;
  value: string;
  error: string | null;
  isLoading: boolean;
  onChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => Promise<void>;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-message-dialog-title"
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg"
      >
        <h2 id="admin-message-dialog-title" className="mb-4 text-xl font-bold text-gray-900">
          Message User
        </h2>

        <p className="mb-4 text-sm text-gray-600">
          Send a direct message to <strong>{userName}</strong>.
        </p>

        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <label htmlFor="admin-user-message" className="mb-2 block text-sm font-medium text-gray-700">
            Message
          </label>
          <textarea
            id="admin-user-message"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            rows={5}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Write your message here"
            disabled={isLoading}
            autoFocus
          />
        </div>

        {error ? <div className="mb-4 text-sm font-semibold text-red-700">{error}</div> : null}

        <div className="mt-6 flex justify-end gap-3 border-t border-gray-200 pt-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void onSubmit()}
            disabled={isLoading || value.trim().length === 0}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: '#46A8CC' }}
          >
            {isLoading ? 'Sending...' : 'Send Message'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTrust, setFilterTrust] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [messageDialog, setMessageDialog] = useState<MessageDialogState>(null);
  const [messageBody, setMessageBody] = useState('');
  const [messageError, setMessageError] = useState<string | null>(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const fetchUsers = useCallback(
    async (page = 1) => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', '25');

        if (searchTerm) {
          params.set('search', searchTerm);
        }

        if (filterTrust !== 'all') {
          params.set('trustLevel', filterTrust);
        }

        if (filterRole !== 'all') {
          params.set('role', filterRole);
        }

        const response = await fetch(`/api/admin/users?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }

        const data = await response.json();
        setUsers(data.users);
        setPagination(data.pagination);
      } catch (fetchError: unknown) {
        setError(getErrorMessage(fetchError, 'Failed to fetch users'));
      } finally {
        setIsLoading(false);
      }
    },
    [filterRole, filterTrust, searchTerm]
  );

  useEffect(() => {
    const debounce = setTimeout(() => fetchUsers(1), 300);
    return () => clearTimeout(debounce);
  }, [fetchUsers]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setActionLoading(userId);
    setError(null);

    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update role');
      }

      setSuccessMsg(`Role updated to ${formatRoleLabel(newRole)}`);
      setEditingRole(null);
      fetchUsers(pagination.page);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (updateError: unknown) {
      setError(getErrorMessage(updateError, 'Failed to update role'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleVouch = async (userId: string) => {
    setActionLoading(userId);
    setError(null);

    try {
      const response = await fetch(`/api/users/${userId}/vouch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to vouch for user');
      }

      setSuccessMsg(data.message || 'Vouch successful');
      setExpandedUser(null);
      fetchUsers(pagination.page);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (vouchError: unknown) {
      setError(getErrorMessage(vouchError, 'Failed to vouch for user'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleTrustAction = async (
    userId: string,
    action: 'ban' | 'revoke' | 'reinstate',
    reason?: string
  ) => {
    setActionLoading(userId);
    setError(null);

    try {
      let url = '';
      let body: Record<string, string> = { userId };

      switch (action) {
        case 'ban':
          url = '/api/trust/ban';
          body = { ...body, reason: reason || 'Banned by admin' };
          break;
        case 'revoke':
          url = '/api/trust/revoke';
          body = { ...body, reason: reason || 'Trust revoked by admin' };
          break;
        case 'reinstate':
          url = '/api/trust/reinstate';
          body = { ...body, trustLevel: 'TRUSTED' };
          break;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action} user`);
      }

      setSuccessMsg(data.message || `User ${action} successful`);
      setExpandedUser(null);
      fetchUsers(pagination.page);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (trustError: unknown) {
      setError(getErrorMessage(trustError, `Failed to ${action} user`));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    const confirmation = prompt(
      `PERMANENTLY DELETE "${userName}"?\n\nThis will delete all their articles, comments, events, marketplace listings, vouch records, messages, and audit logs.\n\nType "DELETE" to confirm:`
    );

    if (confirmation !== 'DELETE') {
      return;
    }

    setActionLoading(userId);
    setError(null);

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete user');
      }

      setSuccessMsg(data.message || 'User deleted');
      setExpandedUser(null);
      fetchUsers(pagination.page);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (deleteError: unknown) {
      setError(getErrorMessage(deleteError, 'Failed to delete user'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenMessageDialog = (userId: string, userName: string) => {
    setMessageDialog({ userId, userName });
    setMessageBody('');
    setMessageError(null);
  };

  const handleCloseMessageDialog = () => {
    if (isSendingMessage) {
      return;
    }

    setMessageDialog(null);
    setMessageBody('');
    setMessageError(null);
  };

  const handleSendMessage = async () => {
    if (!messageDialog) {
      return;
    }

    const trimmedBody = messageBody.trim();
    if (!trimmedBody) {
      setMessageError('Message is required.');
      return;
    }

    setIsSendingMessage(true);
    setMessageError(null);

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: messageDialog.userId,
          body: trimmedBody,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      setSuccessMsg(`Message sent to ${messageDialog.userName}`);
      setMessageDialog(null);
      setMessageBody('');
      setTimeout(() => setSuccessMsg(null), 3000);
      router.push(`/messages/${data.conversationId}`);
    } catch (sendError: unknown) {
      setMessageError(getErrorMessage(sendError, 'Failed to send message'));
    } finally {
      setIsSendingMessage(false);
    }
  };

  const safePage = Math.max(1, Math.min(pagination.page, Math.max(pagination.totalPages, 1)));

  return (
    <div className="space-y-4">
      <div className="admin-card">
        <div className="admin-card-header">
          <div className="flex items-center gap-0">
            <div className="admin-card-header-icon" aria-hidden="true">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="admin-card-header-label">Users</div>
          </div>
          <div className="admin-card-header-actions"></div>
        </div>

        <div className="admin-card-body">
          <div className="admin-list">
            <div className="admin-list-toolbar">
              <label className="admin-list-filter">
                <span className="admin-list-filter-label">Filter: Name or Email</span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by first name, last name, or email"
                  className="admin-list-filter-input"
                />
              </label>

              <div className="flex flex-wrap items-end gap-3">
                <label className="admin-list-filter min-w-[10rem]">
                  <span className="admin-list-filter-label">Trust</span>
                  <select
                    value={filterTrust}
                    onChange={(event) => setFilterTrust(event.target.value)}
                    className="admin-list-cell-select min-w-[10rem]"
                  >
                    <option value="all">All trust levels</option>
                    <option value="TRUSTED">Trusted</option>
                    <option value="REGISTERED">Registered</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="ANONYMOUS">Anonymous</option>
                  </select>
                </label>

                <label className="admin-list-filter min-w-[10rem]">
                  <span className="admin-list-filter-label">Role</span>
                  <select
                    value={filterRole}
                    onChange={(event) => setFilterRole(event.target.value)}
                    className="admin-list-cell-select min-w-[10rem]"
                  >
                    <option value="all">All roles</option>
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {formatRoleLabel(role)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            {successMsg ? <div className="text-xs font-semibold text-green-700">{successMsg}</div> : null}
            {error ? <div className="admin-list-error">{error}</div> : null}

            <div className="admin-list-table-wrap">
              <table className="admin-list-table">
                <thead className="admin-list-head">
                  <tr>
                    <th className="admin-list-header-cell">User</th>
                    <th className="admin-list-header-cell">Email</th>
                    <th className="admin-list-header-cell">Trust</th>
                    <th className="admin-list-header-cell">Role</th>
                    <th className="admin-list-header-cell">Last Seen</th>
                    <th className="admin-list-header-cell">Vouched By</th>
                    <th className="admin-list-header-cell">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td className="admin-list-empty" colSpan={7}>
                        Loading users...
                      </td>
                    </tr>
                  ) : users.length > 0 ? (
                    users.map((user) => {
                      const isExpanded = expandedUser === user.id;
                      const isActing = actionLoading === user.id;

                      return (
                        <Fragment key={user.id}>
                          <tr className="admin-list-row">
                            <td className="admin-list-cell">
                              <a href={`/profile/${user.id}`} className="admin-list-link">
                                {user.firstName} {user.lastName}
                              </a>
                            </td>
                            <td className="admin-list-cell">{user.email}</td>
                            <td className="admin-list-cell">
                              <span className="inline-flex rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700">
                                {user.trustLevel}
                              </span>
                            </td>
                            <td className="admin-list-cell">
                              {editingRole === user.id ? (
                                <select
                                  defaultValue={user.role}
                                  onChange={(event) => handleRoleChange(user.id, event.target.value)}
                                  onBlur={() => setEditingRole(null)}
                                  autoFocus
                                  disabled={isActing}
                                  className="admin-list-cell-select"
                                >
                                  {ROLES.map((role) => (
                                    <option key={role} value={role}>
                                      {formatRoleLabel(role)}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <CrudActionButton
                                  type="button"
                                  variant="inline"
                                  icon={Settings2}
                                  label="Change role"
                                  className="gap-1"
                                  onClick={() => setEditingRole(user.id)}
                                >
                                  {formatRoleLabel(user.role)}
                                  <span className="text-[#2563eb]" aria-hidden="true">
                                    ▾
                                  </span>
                                </CrudActionButton>
                              )}
                            </td>
                            <td className="admin-list-cell">{formatDateTime(user.lastSeenAt)}</td>
                            <td className="admin-list-cell">
                              {user.vouchedBy.length > 0 ? (
                                <div className="font-medium text-slate-900">{user.vouchedBy.join(', ')}</div>
                              ) : (
                                <div className="text-slate-400">No vouchers yet</div>
                              )}
                            </td>
                            <td className="admin-list-cell">
                              <CrudActionButton
                                type="button"
                                variant="inline"
                                icon={Settings2}
                                label={isExpanded ? 'Close user actions' : 'Manage user'}
                                onClick={() => setExpandedUser(isExpanded ? null : user.id)}
                              >
                                {isExpanded ? 'Close' : 'Manage'}
                              </CrudActionButton>
                            </td>
                          </tr>

                          {isExpanded ? (
                            <tr className="admin-list-row bg-slate-50">
                              <td className="admin-list-cell" colSpan={7}>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                                  <CrudActionLink href={`/profile/${user.id}`} variant="inline-link" icon={Eye} label="View profile">
                                    View profile
                                  </CrudActionLink>

                                  <CrudActionButton
                                    type="button"
                                    variant="inline-link"
                                    icon={MessageSquare}
                                    label="Message user"
                                    onClick={() =>
                                      handleOpenMessageDialog(user.id, `${user.firstName} ${user.lastName}`)
                                    }
                                  >
                                    Message
                                  </CrudActionButton>

                                  {user.trustLevel === 'REGISTERED' ? (
                                    <CrudActionButton
                                      type="button"
                                      variant="inline-success"
                                      icon={ShieldCheck}
                                      label={isActing ? 'Working' : 'Vouch user'}
                                      onClick={() => handleVouch(user.id)}
                                      disabled={isActing}
                                    >
                                      {isActing ? 'Working...' : 'Vouch user'}
                                    </CrudActionButton>
                                  ) : null}

                                  {user.trustLevel === 'TRUSTED' ? (
                                    <CrudActionButton
                                      type="button"
                                      variant="inline-danger"
                                      icon={ShieldMinus}
                                      label={isActing ? 'Working' : 'Revoke trust'}
                                      onClick={() => handleTrustAction(user.id, 'revoke')}
                                      disabled={isActing}
                                    >
                                      {isActing ? 'Working...' : 'Revoke trust'}
                                    </CrudActionButton>
                                  ) : null}

                                  {user.trustLevel === 'SUSPENDED' ? (
                                    <CrudActionButton
                                      type="button"
                                      variant="inline-success"
                                      icon={ShieldPlus}
                                      label={isActing ? 'Working' : 'Reinstate user'}
                                      onClick={() => handleTrustAction(user.id, 'reinstate')}
                                      disabled={isActing}
                                    >
                                      {isActing ? 'Working...' : 'Reinstate'}
                                    </CrudActionButton>
                                  ) : null}

                                  {user.trustLevel !== 'SUSPENDED' ? (
                                    <CrudActionButton
                                      type="button"
                                      variant="inline-danger"
                                      icon={ShieldX}
                                      label={isActing ? 'Working' : 'Ban user'}
                                      onClick={() => {
                                        const reason = prompt('Ban reason:');
                                        if (reason) {
                                          handleTrustAction(user.id, 'ban', reason);
                                        }
                                      }}
                                      disabled={isActing}
                                    >
                                      {isActing ? 'Working...' : 'Ban user'}
                                    </CrudActionButton>
                                  ) : null}

                                  <CrudActionButton
                                    type="button"
                                    variant="inline-danger"
                                    icon={Trash2}
                                    label={isActing ? 'Working' : 'Delete user'}
                                    onClick={() =>
                                      handleDeleteUser(user.id, `${user.firstName} ${user.lastName}`)
                                    }
                                    disabled={isActing}
                                  >
                                    {isActing ? 'Working...' : 'Delete user'}
                                  </CrudActionButton>
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      );
                    })
                  ) : (
                    <tr>
                      <td className="admin-list-empty" colSpan={7}>
                        No users found matching the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="admin-list-pagination">
              <div className="admin-list-pagination-label">
                {pagination.total > 0
                  ? `Showing ${(safePage - 1) * pagination.limit + 1}-${Math.min(
                      safePage * pagination.limit,
                      pagination.total
                    )} of ${pagination.total} users`
                  : '0 users'}
              </div>
              <div className="admin-list-pagination-actions">
                <button
                  type="button"
                  onClick={() => fetchUsers(safePage - 1)}
                  disabled={safePage <= 1 || isLoading}
                  className="admin-list-pagination-button"
                >
                  Previous
                </button>
                <span className="admin-list-pagination-page">
                  Page {safePage} of {Math.max(pagination.totalPages, 1)}
                </span>
                <button
                  type="button"
                  onClick={() => fetchUsers(safePage + 1)}
                  disabled={safePage >= pagination.totalPages || isLoading || pagination.totalPages === 0}
                  className="admin-list-pagination-button"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="admin-card-footer">
          <div className="admin-card-footer-label"></div>
          <div className="admin-card-footer-actions"></div>
        </div>
      </div>

      {messageDialog ? (
        <MessageUserDialog
          userName={messageDialog.userName}
          value={messageBody}
          error={messageError}
          isLoading={isSendingMessage}
          onChange={setMessageBody}
          onCancel={handleCloseMessageDialog}
          onSubmit={handleSendMessage}
        />
      ) : null}
    </div>
  );
}
