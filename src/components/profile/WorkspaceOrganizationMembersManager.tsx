'use client';

import { FormEvent, useMemo, useState } from 'react';
import { ListChecks, Plus, Save } from 'lucide-react';
import { CrudActionButton } from '@/components/shared/CrudAction';
import StatusMessage from '@/components/shared/StatusMessage';
import {
  ORGANIZATION_MEMBERSHIP_ROLE_OPTIONS,
  ORGANIZATION_MEMBERSHIP_STATUS_OPTIONS,
} from '@/lib/organization-membership';
import { formatOrganizationTypeLabel } from '@/lib/organizations';

type MembershipRole =
  | 'OWNER'
  | 'MANAGER'
  | 'STAFF'
  | 'BOARD_MEMBER'
  | 'VOLUNTEER'
  | 'PASTOR'
  | 'OFFICIAL'
  | 'ADMINISTRATOR';

type MembershipStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'REMOVED';

interface MembershipRecord {
  id: string;
  role: MembershipRole;
  status: MembershipStatus;
  title: string | null;
  isPublic: boolean;
  isPrimaryContact: boolean;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface CommunityUserRecord {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface MembershipCreateFormState {
  userId: string;
  role: MembershipRole;
  status: MembershipStatus;
  title: string;
  isPublic: boolean;
  isPrimaryContact: boolean;
}

function buildMembershipCreateFormState(): MembershipCreateFormState {
  return {
    userId: '',
    role: 'MANAGER',
    status: 'ACTIVE',
    title: '',
    isPublic: false,
    isPrimaryContact: false,
  };
}

function MembershipEditor({
  membership,
  isSaving,
  canEditRole,
  canEditStatus,
  isEditingRole,
  isEditingStatus,
  onEditRole,
  onEditStatus,
  onSave,
}: {
  membership: MembershipRecord;
  isSaving: boolean;
  canEditRole: boolean;
  canEditStatus: boolean;
  isEditingRole: boolean;
  isEditingStatus: boolean;
  onEditRole: (membershipId: string | null) => void;
  onEditStatus: (membershipId: string | null) => void;
  onSave: (
    membershipId: string,
    values: Pick<MembershipRecord, 'title' | 'isPublic' | 'isPrimaryContact'> & Partial<Pick<MembershipRecord, 'role' | 'status'>>
  ) => Promise<void>;
}) {
  const [title, setTitle] = useState(membership.title || '');
  const [isPublic, setIsPublic] = useState(membership.isPublic);
  const [isPrimaryContact, setIsPrimaryContact] = useState(membership.isPrimaryContact);

  return (
    <tr className="admin-list-row">
      <td className="admin-list-cell">
        <span className="font-semibold text-slate-950">
          {membership.user.firstName} {membership.user.lastName}
        </span>
        <span className="text-slate-400"> · </span>
        <span className="text-slate-500">{membership.user.email}</span>
      </td>
      <td className="admin-list-cell">
        {canEditRole && isEditingRole ? (
          <select
            className="admin-list-cell-select"
            defaultValue={membership.role}
            disabled={isSaving}
            onBlur={() => {
              if (!isSaving) onEditRole(null);
            }}
            onChange={(event) =>
              void onSave(membership.id, {
                title,
                isPublic,
                isPrimaryContact,
                role: event.target.value as MembershipRole,
              })
            }
            autoFocus
          >
            {ORGANIZATION_MEMBERSHIP_ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {formatOrganizationTypeLabel(role)}
              </option>
            ))}
          </select>
        ) : canEditRole ? (
          <CrudActionButton type="button" variant="inline" icon={ListChecks} label="Change role" onClick={() => onEditRole(membership.id)}>
            {formatOrganizationTypeLabel(membership.role)}
          </CrudActionButton>
        ) : (
          <span className="text-sm text-slate-700">{formatOrganizationTypeLabel(membership.role)}</span>
        )}
      </td>
      <td className="admin-list-cell">
        {canEditStatus && isEditingStatus ? (
          <select
            className="admin-list-cell-select"
            defaultValue={membership.status}
            disabled={isSaving}
            onBlur={() => {
              if (!isSaving) onEditStatus(null);
            }}
            onChange={(event) =>
              void onSave(membership.id, {
                title,
                isPublic,
                isPrimaryContact,
                status: event.target.value as MembershipStatus,
              })
            }
            autoFocus
          >
            {ORGANIZATION_MEMBERSHIP_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {formatOrganizationTypeLabel(status)}
              </option>
            ))}
          </select>
        ) : canEditStatus ? (
          <CrudActionButton type="button" variant="inline" icon={ListChecks} label="Change status" onClick={() => onEditStatus(membership.id)}>
            {formatOrganizationTypeLabel(membership.status)}
          </CrudActionButton>
        ) : (
          <span className="text-sm text-slate-700">{formatOrganizationTypeLabel(membership.status)}</span>
        )}
      </td>
      <td className="admin-list-cell">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Public title override"
          className="form-input min-w-[220px] h-9 py-1"
        />
      </td>
      <td className="admin-list-cell">
        <div className="flex flex-wrap items-center gap-4 whitespace-nowrap">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-300" />
            <span>Roster</span>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={isPrimaryContact} onChange={(event) => setIsPrimaryContact(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-300" />
            <span>Primary</span>
          </label>
        </div>
      </td>
      <td className="admin-list-cell">
        <CrudActionButton
          type="button"
          variant="secondary"
          icon={Save}
          label="Save membership"
          disabled={isSaving}
          onClick={() =>
            void onSave(membership.id, {
              title,
              isPublic,
              isPrimaryContact,
            })
          }
        >
          Save
        </CrudActionButton>
      </td>
    </tr>
  );
}

export default function WorkspaceOrganizationMembersManager({
  profileUserId,
  organizationId,
  actorRole,
  initialMemberships,
  availableCommunityUsers,
}: {
  profileUserId: string;
  organizationId: string;
  actorRole: MembershipRole;
  initialMemberships: MembershipRecord[];
  availableCommunityUsers: CommunityUserRecord[];
}) {
  const [memberships, setMemberships] = useState(initialMemberships);
  const [searchValue, setSearchValue] = useState('');
  const [filter, setFilter] = useState<'ACTIVE' | 'PENDING' | 'REJECTED' | 'REMOVED' | 'ALL'>('ACTIVE');
  const [editingRoleMembershipId, setEditingRoleMembershipId] = useState<string | null>(null);
  const [editingStatusMembershipId, setEditingStatusMembershipId] = useState<string | null>(null);
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [memberSearchValue, setMemberSearchValue] = useState('');
  const [newMembershipForm, setNewMembershipForm] = useState<MembershipCreateFormState>(() => buildMembershipCreateFormState());
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const normalizedSearch = searchValue.trim().toLowerCase();
  const filteredMemberships = memberships.filter((membership) => {
    const matchesText =
      !normalizedSearch ||
      membership.user.firstName.toLowerCase().includes(normalizedSearch) ||
      membership.user.lastName.toLowerCase().includes(normalizedSearch) ||
      membership.user.email.toLowerCase().includes(normalizedSearch);

    const matchesStatus = filter === 'ALL' ? true : membership.status === filter;
    return matchesText && matchesStatus;
  });

  const filteredAvailableCommunityUsers = useMemo(() => {
    const normalized = memberSearchValue.trim().toLowerCase();
    return availableCommunityUsers.filter((user) => {
      if (!normalized) return true;
      return (
        user.firstName.toLowerCase().includes(normalized) ||
        user.lastName.toLowerCase().includes(normalized) ||
        user.email.toLowerCase().includes(normalized)
      );
    });
  }, [availableCommunityUsers, memberSearchValue]);

  async function saveMembership(
    membershipId: string,
    values: Pick<MembershipRecord, 'title' | 'isPublic' | 'isPrimaryContact'> & Partial<Pick<MembershipRecord, 'role' | 'status'>>
  ) {
    setSavingKey(`membership-${membershipId}`);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/profile/${profileUserId}/workspace/organizations/${organizationId}/memberships/${membershipId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await response.json();

      if (!response.ok) {
        const validationMessage = Array.isArray(data.details)
          ? data.details.map((detail: { message?: string }) => detail.message).filter(Boolean).join(', ')
          : '';
        throw new Error(validationMessage || data.error || 'Failed to update membership');
      }

      setMemberships((current) =>
        current.map((membership) => {
          if (data.membership.isPrimaryContact && membership.id !== membershipId) {
            return { ...membership, isPrimaryContact: false };
          }

          return membership.id === membershipId ? { ...membership, ...data.membership } : membership;
        })
      );
      setEditingRoleMembershipId(null);
      setEditingStatusMembershipId(null);
      setSuccess('Membership updated.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to update membership');
    } finally {
      setSavingKey(null);
    }
  }

  async function createMembership(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingKey('new-membership');
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/profile/${profileUserId}/workspace/organizations/${organizationId}/memberships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMembershipForm),
      });
      const data = await response.json();

      if (!response.ok) {
        const validationMessage = Array.isArray(data.details)
          ? data.details.map((detail: { message?: string }) => detail.message).filter(Boolean).join(', ')
          : '';
        throw new Error(validationMessage || data.error || 'Failed to add member');
      }

      setMemberships((current) => [
        ...current.map((membership) =>
          data.membership.isPrimaryContact ? { ...membership, isPrimaryContact: false } : membership
        ),
        data.membership,
      ]);
      setNewMembershipForm(buildMembershipCreateFormState());
      setMemberSearchValue('');
      setShowAddMemberForm(false);
      setSuccess('Member added.');
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to add member');
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <section className="rounded-xl border border-[var(--hl-admin-border)] bg-white shadow-sm">
      <div className="border-b border-[var(--hl-admin-border)] px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Members</p>
        <h3 className="mt-1 text-lg font-semibold text-slate-950">Manage organization members</h3>
        <p className="mt-1 text-sm text-slate-600">
          Review active members and pending claims, add same-community users, and control roster visibility and primary contact status.
        </p>
      </div>
      <div className="space-y-5 px-5 py-5">

      {error ? (
        <StatusMessage variant="error" title="Membership update failed">
          <p>{error}</p>
        </StatusMessage>
      ) : null}

      {success ? (
        <StatusMessage variant="success" title="Memberships updated">
          <p>{success}</p>
        </StatusMessage>
      ) : null}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-500">
          {availableCommunityUsers.length} eligible same-community user{availableCommunityUsers.length === 1 ? '' : 's'} available
        </div>
        <CrudActionButton
          type="button"
          variant={showAddMemberForm ? 'secondary' : 'primary'}
          icon={Plus}
          label={showAddMemberForm ? 'Close add member' : 'Add member'}
          onClick={() => {
            setShowAddMemberForm((current) => !current);
            if (showAddMemberForm) {
              setMemberSearchValue('');
              setNewMembershipForm(buildMembershipCreateFormState());
            }
          }}
          disabled={availableCommunityUsers.length === 0}
        >
          {showAddMemberForm ? 'Close' : 'Add Member'}
        </CrudActionButton>
      </div>

      {showAddMemberForm ? (
        availableCommunityUsers.length > 0 ? (
          <form onSubmit={createMembership} className="mb-5 space-y-3 rounded-2xl border border-dashed border-slate-300 p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="form-label text-slate-500">Search Users</label>
                <input value={memberSearchValue} onChange={(event) => setMemberSearchValue(event.target.value)} className="form-input" placeholder="Search by name or email" />
              </div>
              <div>
                <label className="form-label text-slate-500">User</label>
                <select value={newMembershipForm.userId} onChange={(event) => setNewMembershipForm((current) => ({ ...current, userId: event.target.value }))} className="form-input">
                  <option value="">Select a community user</option>
                  {filteredAvailableCommunityUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label text-slate-500">Role</label>
                <select value={newMembershipForm.role} onChange={(event) => setNewMembershipForm((current) => ({ ...current, role: event.target.value as MembershipRole }))} className="form-input">
                  {ORGANIZATION_MEMBERSHIP_ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {formatOrganizationTypeLabel(role)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label text-slate-500">Status</label>
                <select value={newMembershipForm.status} onChange={(event) => setNewMembershipForm((current) => ({ ...current, status: event.target.value as MembershipStatus }))} className="form-input">
                  {ORGANIZATION_MEMBERSHIP_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {formatOrganizationTypeLabel(status)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="form-label text-slate-500">Public Title Override</label>
                <input value={newMembershipForm.title} onChange={(event) => setNewMembershipForm((current) => ({ ...current, title: event.target.value }))} className="form-input" placeholder="Optional" />
              </div>
              <div className="md:col-span-2 flex flex-wrap gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={newMembershipForm.isPublic} onChange={(event) => setNewMembershipForm((current) => ({ ...current, isPublic: event.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-300" />
                  <span>Show on roster</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={newMembershipForm.isPrimaryContact} onChange={(event) => setNewMembershipForm((current) => ({ ...current, isPrimaryContact: event.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-300" />
                  <span>Primary contact</span>
                </label>
              </div>
            </div>
            <div className="text-xs text-slate-500">
              {actorRole !== 'OWNER' ? 'Only owners can grant the owner role.' : 'Owners can grant any organization role.'}
            </div>
            <CrudActionButton type="submit" variant="primary" icon={Plus} label={savingKey === 'new-membership' ? 'Adding member' : 'Add member'} disabled={savingKey === 'new-membership'}>
              {savingKey === 'new-membership' ? 'Adding...' : 'Add Member'}
            </CrudActionButton>
          </form>
        ) : (
          <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-600">
            No additional same-community users are available to attach to this organization.
          </div>
        )
      ) : null}

      <div className="admin-list">
        <div className="admin-list-toolbar">
          <label className="admin-list-filter">
            <span className="admin-list-filter-label">Filter: Member Name</span>
            <div className="relative">
              <input
                type="text"
                value={searchValue}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setSearchValue(nextValue);
                  if (nextValue.trim()) {
                    setFilter('ALL');
                  }
                }}
                placeholder="Search by first name, last name, or email"
                className="admin-list-filter-input pr-10"
              />
              {searchValue ? (
                <button type="button" onClick={() => { setSearchValue(''); setFilter('ACTIVE'); }} className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-sm font-semibold text-slate-400 transition hover:text-slate-700" aria-label="Clear member name filter" title="Clear member name filter">
                  x
                </button>
              ) : null}
            </div>
          </label>
          <label className="admin-list-filter">
            <span className="admin-list-filter-label">Filter: Member Status</span>
            <select value={filter} onChange={(event) => setFilter(event.target.value as 'ACTIVE' | 'PENDING' | 'REJECTED' | 'REMOVED' | 'ALL')} className="admin-list-cell-select min-w-[11rem]">
              {['ACTIVE', 'PENDING', 'REJECTED', 'REMOVED', 'ALL'].map((status) => (
                <option key={status} value={status}>
                  {status === 'ALL' ? 'All' : formatOrganizationTypeLabel(status)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="admin-list-table-wrap">
          <table className="admin-list-table">
            <thead className="admin-list-head">
              <tr>
                <th className="admin-list-header-cell">Member</th>
                <th className="admin-list-header-cell">Role</th>
                <th className="admin-list-header-cell">Status</th>
                <th className="admin-list-header-cell">Public Title</th>
                <th className="admin-list-header-cell">Visibility</th>
                <th className="admin-list-header-cell">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredMemberships.length > 0 ? (
                filteredMemberships.map((membership) => {
                  const targetIsOwner = membership.role === 'OWNER';
                  const canEditRole = actorRole === 'OWNER' || !targetIsOwner;
                  const canEditStatus = actorRole === 'OWNER' || !targetIsOwner;

                  return (
                    <MembershipEditor
                      key={membership.id}
                      membership={membership}
                      isSaving={savingKey === `membership-${membership.id}`}
                      canEditRole={canEditRole}
                      canEditStatus={canEditStatus}
                      isEditingRole={editingRoleMembershipId === membership.id}
                      isEditingStatus={editingStatusMembershipId === membership.id}
                      onEditRole={setEditingRoleMembershipId}
                      onEditStatus={setEditingStatusMembershipId}
                      onSave={saveMembership}
                    />
                  );
                })
              ) : (
                <tr>
                  <td className="admin-list-empty" colSpan={6}>
                    No {filter === 'ALL' ? '' : `${formatOrganizationTypeLabel(filter).toLowerCase()} `}members are visible in this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </section>
  );
}
