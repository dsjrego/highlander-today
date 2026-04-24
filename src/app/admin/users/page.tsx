'use client';

import Link from 'next/link';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
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
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CrudActionButton, CrudActionLink } from '@/components/shared/CrudAction';
import PromptDialog from '@/components/shared/PromptDialog';
import { useDialogAccessibility } from '@/components/shared/useDialogAccessibility';
import { AdminBulkBar } from '@/components/admin/AdminBulkBar';
import { AdminChip } from '@/components/admin/AdminChip';
import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminFilterBar, AdminFacet } from '@/components/admin/AdminFilterBar';
import { AdminPage } from '@/components/admin/AdminPage';
import { AdminViewTabs } from '@/components/admin/AdminViewTabs';

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

interface UserStats {
  totalUsers: number;
  trustedCount: number;
  registeredCount: number;
  suspendedCount: number;
}

const EMPTY_STATS: UserStats = {
  totalUsers: 0,
  trustedCount: 0,
  registeredCount: 0,
  suspendedCount: 0,
};

const ROLES = ['READER', 'CONTRIBUTOR', 'STAFF_WRITER', 'EDITOR', 'ADMIN', 'SUPER_ADMIN'];

type MessageDialogState = {
  userId: string;
  userName: string;
} | null;

type DeleteDialogState = {
  userId: string;
  userName: string;
} | null;

type BanDialogState = {
  userId: string;
  userName: string;
} | null;

function formatRoleLabel(role: string) {
  return role.replace(/_/g, ' ');
}

function formatUserName(firstName: string, lastName: string) {
  const fullName = [lastName, firstName].filter(Boolean).join(', ');
  return fullName || 'Unnamed user';
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

function trustTone(trustLevel: User['trustLevel']): 'ok' | 'pend' | 'bad' | 'neu' {
  switch (trustLevel) {
    case 'TRUSTED':
      return 'ok';
    case 'REGISTERED':
      return 'pend';
    case 'SUSPENDED':
      return 'bad';
    default:
      return 'neu';
  }
}

function viewToTrustFilter(view: string) {
  switch (view) {
    case 'trusted':
      return 'TRUSTED';
    case 'registered':
      return 'REGISTERED';
    case 'suspended':
      return 'SUSPENDED';
    default:
      return 'all';
  }
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
  const titleId = useId();
  const descriptionId = useId();
  const errorId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);

  useDialogAccessibility({
    isOpen: true,
    onClose: onCancel,
    containerRef: dialogRef,
    initialFocusRef: cancelButtonRef,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={onCancel}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={error ? `${descriptionId} ${errorId}` : descriptionId}
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="mb-4 text-xl font-bold text-gray-900">
          Message User
        </h2>

        <p id={descriptionId} className="mb-4 text-sm text-gray-600">
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

        {error ? <div id={errorId} className="mb-4 text-sm font-semibold text-red-700">{error}</div> : null}

        <div className="mt-6 flex justify-end gap-3 border-t border-gray-200 pt-6">
          <button
            ref={cancelButtonRef}
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
            style={{ backgroundColor: 'var(--brand-primary)' }}
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeView = searchParams.get('view') ?? 'all';
  const focusedUserId = searchParams.get('focus');

  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
  });
  const [stats, setStats] = useState<UserStats>(EMPTY_STATS);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTrust, setFilterTrust] = useState(viewToTrustFilter(activeView));
  const [filterRole, setFilterRole] = useState('all');
  const [filterDirectory, setFilterDirectory] = useState('all');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [roleDrafts, setRoleDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [messageDialog, setMessageDialog] = useState<MessageDialogState>(null);
  const [messageBody, setMessageBody] = useState('');
  const [messageError, setMessageError] = useState<string | null>(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>(null);
  const [banDialog, setBanDialog] = useState<BanDialogState>(null);

  const updateSearchParams = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '') {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      });

      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    const nextTrust = viewToTrustFilter(activeView);
    setFilterTrust((current) => (current === nextTrust ? current : nextTrust));
  }, [activeView]);

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

        if (filterDirectory !== 'all') {
          params.set('directory', filterDirectory);
        }

        const response = await fetch(`/api/admin/users?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }

        const data = await response.json();
        setUsers(data.users);
        setPagination(data.pagination);
        setStats(data.stats ?? EMPTY_STATS);
      } catch (fetchError: unknown) {
        setError(getErrorMessage(fetchError, 'Failed to fetch users'));
      } finally {
        setIsLoading(false);
      }
    },
    [filterDirectory, filterRole, filterTrust, searchTerm]
  );

  useEffect(() => {
    const debounce = setTimeout(() => fetchUsers(1), 300);
    return () => clearTimeout(debounce);
  }, [fetchUsers]);

  useEffect(() => {
    setSelectedUserIds((current) => {
      const visibleIds = new Set(users.map((user) => user.id));
      const next = new Set(Array.from(current).filter((id) => visibleIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [users]);

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
      setRoleDrafts((current) => ({ ...current, [userId]: newRole }));
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
      fetchUsers(pagination.page);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (trustError: unknown) {
      setError(getErrorMessage(trustError, `Failed to ${action} user`));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId: string, confirmation: string) => {
    if (confirmation.trim() !== 'DELETE') {
      setError('Type DELETE exactly to confirm permanent deletion.');
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
      setDeleteDialog(null);
      updateSearchParams({ focus: null });
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

  const handleBulkCopyEmails = async () => {
    const selectedUsers = users.filter((user) => selectedUserIds.has(user.id));
    if (selectedUsers.length === 0) {
      return;
    }

    try {
      await navigator.clipboard.writeText(selectedUsers.map((user) => user.email).join(', '));
      setSuccessMsg(`Copied ${selectedUsers.length} email${selectedUsers.length === 1 ? '' : 's'}.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (clipboardError: unknown) {
      setError(getErrorMessage(clipboardError, 'Failed to copy selected emails'));
    }
  };

  const safePage = Math.max(1, Math.min(pagination.page, Math.max(pagination.totalPages, 1)));
  const allVisibleSelected = users.length > 0 && users.every((user) => selectedUserIds.has(user.id));
  const focusedUser = users.find((user) => user.id === focusedUserId) ?? null;
  const focusedRoleDraft = focusedUser ? roleDrafts[focusedUser.id] ?? focusedUser.role : 'READER';

  return (
    <AdminPage title="Users" count={stats.totalUsers}>
      <div className="admin-section-card">
        <AdminViewTabs
          defaultView="all"
          views={[
            { key: 'all', label: 'All Users', count: stats.totalUsers },
            { key: 'trusted', label: 'Trusted', count: stats.trustedCount },
            { key: 'registered', label: 'Registered', count: stats.registeredCount, tone: 'pend' },
            { key: 'suspended', label: 'Suspended', count: stats.suspendedCount, tone: 'bad' },
          ]}
        />

        <div className="mt-4 admin-list">
          <AdminFilterBar
            search={
              <label className="admin-list-filter">
                <span className="admin-list-filter-label">Name or Email</span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by first name, last name, or email"
                  className="admin-list-filter-input"
                />
              </label>
            }
            right={
              <div className="flex flex-wrap items-end gap-3">
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
            }
          >
            <AdminFacet
              active={filterDirectory === 'listed'}
              onClick={() => setFilterDirectory((current) => (current === 'listed' ? 'all' : 'listed'))}
              onClear={() => setFilterDirectory('all')}
            >
              In directory
            </AdminFacet>
            <AdminFacet
              active={filterDirectory === 'unlisted'}
              onClick={() => setFilterDirectory((current) => (current === 'unlisted' ? 'all' : 'unlisted'))}
              onClear={() => setFilterDirectory('all')}
            >
              No directory
            </AdminFacet>
          </AdminFilterBar>

          {successMsg ? <div className="text-xs font-semibold text-green-700">{successMsg}</div> : null}
          {error ? <div className="admin-list-error">{error}</div> : null}

          <AdminBulkBar count={selectedUserIds.size} onClear={() => setSelectedUserIds(new Set())}>
            <button
              type="button"
              className="admin-list-pagination-button"
              onClick={() => void handleBulkCopyEmails()}
            >
              Copy emails
            </button>
          </AdminBulkBar>

          <div className="admin-list-table-wrap">
            <table className="admin-list-table">
              <thead className="admin-list-head">
                <tr>
                  <th className="admin-list-header-cell">
                    <input
                      type="checkbox"
                      aria-label={allVisibleSelected ? 'Deselect all visible users' : 'Select all visible users'}
                      checked={allVisibleSelected}
                      onChange={(event) => {
                        if (event.target.checked) {
                          setSelectedUserIds(new Set(users.map((user) => user.id)));
                        } else {
                          setSelectedUserIds(new Set());
                        }
                      }}
                    />
                  </th>
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
                  <tr className="admin-list-row">
                    <td className="admin-list-empty" colSpan={8}>
                      Loading users...
                    </td>
                  </tr>
                ) : users.length > 0 ? (
                  users.map((user) => (
                    <tr key={user.id} className="admin-list-row">
                      <td className="admin-list-cell">
                        <input
                          type="checkbox"
                          aria-label={`Select ${formatUserName(user.firstName, user.lastName)}`}
                          checked={selectedUserIds.has(user.id)}
                          onChange={(event) => {
                            setSelectedUserIds((current) => {
                              const next = new Set(current);
                              if (event.target.checked) {
                                next.add(user.id);
                              } else {
                                next.delete(user.id);
                              }
                              return next;
                            });
                          }}
                        />
                      </td>
                      <td className="admin-list-cell">
                        <Link href={`/profile/${user.id}`} className="admin-list-link">
                          {formatUserName(user.firstName, user.lastName)}
                        </Link>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {user.isIdentityLocked ? <AdminChip tone="role">Identity locked</AdminChip> : null}
                          <span className="text-xs text-slate-500">
                            {user.postCount} contribution{user.postCount === 1 ? '' : 's'}
                          </span>
                        </div>
                      </td>
                      <td className="admin-list-cell">{user.email}</td>
                      <td className="admin-list-cell">
                        <AdminChip tone={trustTone(user.trustLevel)} dot>
                          {user.trustLevel}
                        </AdminChip>
                      </td>
                      <td className="admin-list-cell">
                        <AdminChip tone="role">{formatRoleLabel(user.role)}</AdminChip>
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
                        <div className="flex flex-wrap gap-3">
                          <CrudActionLink href={`/profile/${user.id}`} variant="inline-link" icon={Eye} label="View profile">
                            View
                          </CrudActionLink>
                          <CrudActionButton
                            type="button"
                            variant="inline-link"
                            icon={MessageSquare}
                            label="Message user"
                            onClick={() =>
                              handleOpenMessageDialog(user.id, formatUserName(user.firstName, user.lastName))
                            }
                          >
                            Message
                          </CrudActionButton>
                          <CrudActionButton
                            type="button"
                            variant="inline"
                            icon={Settings2}
                            label="Manage user"
                            onClick={() => updateSearchParams({ focus: user.id })}
                          >
                            Manage
                          </CrudActionButton>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="admin-list-row">
                    <td className="admin-list-empty" colSpan={8}>
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

      <AdminDrawer title={focusedUser ? `Manage ${formatUserName(focusedUser.firstName, focusedUser.lastName)}` : 'Manage User'}>
        {focusedUser ? (
          <div className="space-y-5">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <AdminChip tone={trustTone(focusedUser.trustLevel)} dot>
                  {focusedUser.trustLevel}
                </AdminChip>
                <AdminChip tone="role">{formatRoleLabel(focusedUser.role)}</AdminChip>
                {focusedUser.isIdentityLocked ? <AdminChip tone="role">Identity locked</AdminChip> : null}
              </div>
              <div className="mt-3 space-y-1 text-sm text-slate-600">
                <p>{focusedUser.email}</p>
                <p>Last seen: {formatDateTime(focusedUser.lastSeenAt)}</p>
                <p>
                  {focusedUser.postCount} contribution{focusedUser.postCount === 1 ? '' : 's'} ·{' '}
                  {focusedUser.vouchesReceived} voucher{focusedUser.vouchesReceived === 1 ? '' : 's'} received
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Role</p>
              <div className="flex items-center gap-2">
                <select
                  value={focusedRoleDraft}
                  onChange={(event) =>
                    setRoleDrafts((current) => ({ ...current, [focusedUser.id]: event.target.value }))
                  }
                  className="admin-list-cell-select min-w-[14rem]"
                  disabled={actionLoading === focusedUser.id}
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {formatRoleLabel(role)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="admin-list-pagination-button"
                  onClick={() => handleRoleChange(focusedUser.id, focusedRoleDraft)}
                  disabled={actionLoading === focusedUser.id || focusedRoleDraft === focusedUser.role}
                >
                  Save role
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Actions</p>
              <div className="flex flex-wrap gap-3">
                <CrudActionLink href={`/profile/${focusedUser.id}`} variant="inline-link" icon={Eye} label="View profile">
                  View profile
                </CrudActionLink>
                <CrudActionButton
                  type="button"
                  variant="inline-link"
                  icon={MessageSquare}
                  label="Message user"
                  onClick={() =>
                    handleOpenMessageDialog(
                      focusedUser.id,
                      formatUserName(focusedUser.firstName, focusedUser.lastName)
                    )
                  }
                >
                  Message
                </CrudActionButton>

                {focusedUser.trustLevel === 'REGISTERED' ? (
                  <CrudActionButton
                    type="button"
                    variant="inline-success"
                    icon={ShieldCheck}
                    label={actionLoading === focusedUser.id ? 'Working' : 'Vouch user'}
                    onClick={() => handleVouch(focusedUser.id)}
                    disabled={actionLoading === focusedUser.id}
                  >
                    {actionLoading === focusedUser.id ? 'Working...' : 'Vouch user'}
                  </CrudActionButton>
                ) : null}

                {focusedUser.trustLevel === 'TRUSTED' ? (
                  <CrudActionButton
                    type="button"
                    variant="inline-danger"
                    icon={ShieldMinus}
                    label={actionLoading === focusedUser.id ? 'Working' : 'Revoke trust'}
                    onClick={() => handleTrustAction(focusedUser.id, 'revoke')}
                    disabled={actionLoading === focusedUser.id}
                  >
                    {actionLoading === focusedUser.id ? 'Working...' : 'Revoke trust'}
                  </CrudActionButton>
                ) : null}

                {focusedUser.trustLevel === 'SUSPENDED' ? (
                  <CrudActionButton
                    type="button"
                    variant="inline-success"
                    icon={ShieldPlus}
                    label={actionLoading === focusedUser.id ? 'Working' : 'Reinstate user'}
                    onClick={() => handleTrustAction(focusedUser.id, 'reinstate')}
                    disabled={actionLoading === focusedUser.id}
                  >
                    {actionLoading === focusedUser.id ? 'Working...' : 'Reinstate'}
                  </CrudActionButton>
                ) : null}

                {focusedUser.trustLevel !== 'SUSPENDED' ? (
                  <CrudActionButton
                    type="button"
                    variant="inline-danger"
                    icon={ShieldX}
                    label={actionLoading === focusedUser.id ? 'Working' : 'Ban user'}
                    onClick={() =>
                      setBanDialog({
                        userId: focusedUser.id,
                        userName: formatUserName(focusedUser.firstName, focusedUser.lastName),
                      })
                    }
                    disabled={actionLoading === focusedUser.id}
                  >
                    {actionLoading === focusedUser.id ? 'Working...' : 'Ban user'}
                  </CrudActionButton>
                ) : null}

                <CrudActionButton
                  type="button"
                  variant="inline-danger"
                  icon={Trash2}
                  label={actionLoading === focusedUser.id ? 'Working' : 'Delete user'}
                  onClick={() =>
                    setDeleteDialog({
                      userId: focusedUser.id,
                      userName: formatUserName(focusedUser.firstName, focusedUser.lastName),
                    })
                  }
                  disabled={actionLoading === focusedUser.id}
                >
                  {actionLoading === focusedUser.id ? 'Working...' : 'Delete user'}
                </CrudActionButton>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Vouchers</p>
              {focusedUser.vouchedBy.length > 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  {focusedUser.vouchedBy.join(', ')}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                  No vouchers recorded yet.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
            The selected user is not available in the current page of results.
          </div>
        )}
      </AdminDrawer>

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

      {banDialog ? (
        <PromptDialog
          title={`Ban ${banDialog.userName}?`}
          description="Provide a ban reason. This will suspend the user through the trust system."
          label="Ban reason"
          placeholder="Reason for banning this user"
          confirmLabel="Ban user"
          isSubmitting={actionLoading === banDialog.userId}
          onCancel={() => setBanDialog(null)}
          onConfirm={async (value) => {
            if (!value.trim()) {
              setError('Ban reason is required.');
              return;
            }

            await handleTrustAction(banDialog.userId, 'ban', value.trim());
            setBanDialog(null);
          }}
        />
      ) : null}

      {deleteDialog ? (
        <PromptDialog
          title={`Delete ${deleteDialog.userName}?`}
          description="This permanently deletes the user and their related content, messages, vouch records, and audit history. Type DELETE to continue."
          label="Type DELETE to confirm"
          placeholder="DELETE"
          confirmLabel="Delete user"
          isSubmitting={actionLoading === deleteDialog.userId}
          onCancel={() => setDeleteDialog(null)}
          onConfirm={async (value) => {
            await handleDeleteUser(deleteDialog.userId, value);
          }}
        />
      ) : null}
    </AdminPage>
  );
}
