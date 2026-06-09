'use client';

import { FormEvent, Fragment, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, ListChecks, Plus, Save, Star } from 'lucide-react';
import { AdminChip } from '@/components/admin/AdminChip';
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

interface MembershipEditFormState {
  status: MembershipStatus;
  title: string;
  isPublic: boolean;
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

function buildMembershipEditFormState(membership: MembershipRecord): MembershipEditFormState {
  return {
    status: membership.status,
    title: membership.title || '',
    isPublic: membership.isPublic,
  };
}

function getMembershipStatusTone(status: MembershipStatus): 'ok' | 'pend' | 'bad' | 'neu' {
  switch (status) {
    case 'ACTIVE':
      return 'ok';
    case 'PENDING':
      return 'pend';
    case 'REJECTED':
      return 'bad';
    case 'REMOVED':
      return 'neu';
    default:
      return 'neu';
  }
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.trim().toUpperCase() || '?';
}

function FormSwitch({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-[var(--hl-admin-border)] bg-[var(--hl-admin-surface-muted)] px-4 py-3">
      <div className="space-y-1">
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="text-xs text-slate-500">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`form-switch ${checked ? 'is-checked' : ''}`}
      >
        <span className="form-switch-thumb" />
      </button>
    </div>
  );
}

function MembershipEditor({
  membership,
  form,
  setForm,
  canEditStatus,
  isSaving,
  onSubmit,
  onCancel,
}: {
  membership: MembershipRecord;
  form: MembershipEditFormState;
  setForm: (value: MembershipEditFormState) => void;
  canEditStatus: boolean;
  isSaving: boolean;
  onSubmit: () => Promise<void>;
  onCancel: () => void;
}) {
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        await onSubmit();
      }}
      className="space-y-5 rounded-lg border-l-4 border-l-[var(--brand-accent)] bg-white p-5"
    >
      <div className="space-y-1">
        <h4 className="text-base font-semibold text-slate-950">
          {membership.user.firstName} {membership.user.lastName}
        </h4>
        <p className="text-sm text-slate-600">
          Update roster visibility, public title, and membership status for this organization member.
        </p>
      </div>

      <fieldset className="space-y-4 rounded-lg border border-[var(--hl-admin-border)] p-4">
        <legend className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Membership</legend>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5">
            <span className="form-label text-slate-500">Membership status</span>
            <select
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value as MembershipStatus })}
              className="form-input"
              disabled={!canEditStatus}
            >
              {ORGANIZATION_MEMBERSHIP_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {formatOrganizationTypeLabel(status)}
                </option>
              ))}
            </select>
          </label>
          <div className="space-y-1.5">
            <span className="form-label text-slate-500">Role</span>
            <div className="flex h-[34px] items-center">
              <AdminChip tone="role">{formatOrganizationTypeLabel(membership.role)}</AdminChip>
            </div>
          </div>
          <label className="space-y-1.5 md:col-span-2">
            <span className="form-label text-slate-500">Public title (optional)</span>
            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              className="form-input"
              placeholder="Executive Director, Office Manager, Community Liaison..."
            />
          </label>
        </div>
        {!canEditStatus ? (
          <p className="text-xs text-slate-500">
            Owner memberships must be managed by an owner.
          </p>
        ) : null}
      </fieldset>

      <fieldset className="space-y-4 rounded-lg border border-[var(--hl-admin-border)] p-4">
        <legend className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Visibility</legend>
        <FormSwitch
          label="Show on public roster"
          hint="Allow this membership to appear on the organization’s public member roster."
          checked={form.isPublic}
          onChange={(checked) => setForm({ ...form, isPublic: checked })}
        />
      </fieldset>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--hl-admin-border)] pt-4">
        <CrudActionButton
          type="button"
          variant="secondary"
          icon={ChevronUp}
          label="Cancel member editing"
          disabled={isSaving}
          onClick={onCancel}
        >
          Cancel
        </CrudActionButton>
        <CrudActionButton
          type="submit"
          variant="primary"
          icon={Save}
          label="Save membership"
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Member'}
        </CrudActionButton>
      </div>
    </form>
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
  const [expandedMembershipId, setExpandedMembershipId] = useState<string | 'new' | null>(null);
  const [memberSearchValue, setMemberSearchValue] = useState('');
  const [newMembershipForm, setNewMembershipForm] = useState<MembershipCreateFormState>(() => buildMembershipCreateFormState());
  const [editingForms, setEditingForms] = useState<Record<string, MembershipEditFormState>>(() =>
    Object.fromEntries(initialMemberships.map((membership) => [membership.id, buildMembershipEditFormState(membership)]))
  );
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
      if (!normalized) {
        return true;
      }

      return (
        user.firstName.toLowerCase().includes(normalized) ||
        user.lastName.toLowerCase().includes(normalized) ||
        user.email.toLowerCase().includes(normalized)
      );
    });
  }, [availableCommunityUsers, memberSearchValue]);

  function resetMembershipForm(membership: MembershipRecord) {
    setEditingForms((current) => ({
      ...current,
      [membership.id]: buildMembershipEditFormState(membership),
    }));
  }

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
      setExpandedMembershipId(null);
      setEditingForms((current) => ({
        ...current,
        [membershipId]: buildMembershipEditFormState(data.membership),
      }));
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
      setEditingForms((current) => ({
        ...current,
        [data.membership.id]: buildMembershipEditFormState(data.membership),
      }));
      setNewMembershipForm(buildMembershipCreateFormState());
      setMemberSearchValue('');
      setExpandedMembershipId(null);
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
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Members</p>
            <h3 className="text-lg font-semibold text-slate-950">Manage organization members</h3>
            <p className="text-sm text-slate-600">
              Review active members and pending claims, assign organization roles, and control who appears as a public contact.
            </p>
          </div>
          <CrudActionButton
            type="button"
            variant="primary"
            icon={expandedMembershipId === 'new' ? ChevronUp : Plus}
            label={expandedMembershipId === 'new' ? 'Close add member form' : 'Add member'}
            onClick={() => {
              setError('');
              setSuccess('');
              setExpandedMembershipId((current) => (current === 'new' ? null : 'new'));
              if (expandedMembershipId === 'new') {
                setMemberSearchValue('');
                setNewMembershipForm(buildMembershipCreateFormState());
              }
            }}
            disabled={availableCommunityUsers.length === 0}
          >
            {expandedMembershipId === 'new' ? 'Close' : 'Add Member'}
          </CrudActionButton>
        </div>
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

        {expandedMembershipId === 'new' ? (
          availableCommunityUsers.length > 0 ? (
            <form onSubmit={createMembership} className="space-y-5 rounded-lg border-l-4 border-l-[var(--brand-accent)] bg-white p-5">
              <div className="space-y-1">
                <h4 className="text-base font-semibold text-slate-950">Add member</h4>
                <p className="text-sm text-slate-600">
                  Attach an eligible same-community user to this organization and choose their initial roster settings.
                </p>
              </div>

              <fieldset className="space-y-4 rounded-lg border border-[var(--hl-admin-border)] p-4">
                <legend className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Member</legend>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className="form-label text-slate-500">Search users</span>
                    <input
                      value={memberSearchValue}
                      onChange={(event) => setMemberSearchValue(event.target.value)}
                      className="form-input"
                      placeholder="Search by name or email"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="form-label text-slate-500">User</span>
                    <select
                      value={newMembershipForm.userId}
                      onChange={(event) => setNewMembershipForm((current) => ({ ...current, userId: event.target.value }))}
                      className="form-input"
                    >
                      <option value="">Select a community user</option>
                      {filteredAvailableCommunityUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.firstName} {user.lastName} ({user.email})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1.5">
                    <span className="form-label text-slate-500">Role</span>
                    <select
                      value={newMembershipForm.role}
                      onChange={(event) => setNewMembershipForm((current) => ({ ...current, role: event.target.value as MembershipRole }))}
                      className="form-input"
                    >
                      {ORGANIZATION_MEMBERSHIP_ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>
                          {formatOrganizationTypeLabel(role)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1.5">
                    <span className="form-label text-slate-500">Status</span>
                    <select
                      value={newMembershipForm.status}
                      onChange={(event) => setNewMembershipForm((current) => ({ ...current, status: event.target.value as MembershipStatus }))}
                      className="form-input"
                    >
                      {ORGANIZATION_MEMBERSHIP_STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {formatOrganizationTypeLabel(status)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1.5 md:col-span-2">
                    <span className="form-label text-slate-500">Public title (optional)</span>
                    <input
                      value={newMembershipForm.title}
                      onChange={(event) => setNewMembershipForm((current) => ({ ...current, title: event.target.value }))}
                      className="form-input"
                      placeholder="Executive Director, Office Manager, Community Liaison..."
                    />
                  </label>
                </div>
              </fieldset>

              <fieldset className="space-y-4 rounded-lg border border-[var(--hl-admin-border)] p-4">
                <legend className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Visibility</legend>
                <div className="grid gap-3 md:grid-cols-2">
                  <FormSwitch
                    label="Show on public roster"
                    hint="Allow this member to appear on the organization roster."
                    checked={newMembershipForm.isPublic}
                    onChange={(checked) => setNewMembershipForm((current) => ({ ...current, isPublic: checked }))}
                  />
                  <FormSwitch
                    label="Primary contact"
                    hint="Use this member as the main public-facing contact for the organization."
                    checked={newMembershipForm.isPrimaryContact}
                    onChange={(checked) => setNewMembershipForm((current) => ({ ...current, isPrimaryContact: checked }))}
                  />
                </div>
              </fieldset>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--hl-admin-border)] pt-4">
                <p className="text-xs text-slate-500">
                  {actorRole !== 'OWNER' ? 'Only owners can grant the owner role.' : 'Owners can grant any organization role.'}
                </p>
                <div className="flex flex-wrap gap-2">
                  <CrudActionButton
                    type="button"
                    variant="secondary"
                    icon={ChevronUp}
                    label="Cancel add member"
                    disabled={savingKey === 'new-membership'}
                    onClick={() => {
                      setExpandedMembershipId(null);
                      setMemberSearchValue('');
                      setNewMembershipForm(buildMembershipCreateFormState());
                    }}
                  >
                    Cancel
                  </CrudActionButton>
                  <CrudActionButton
                    type="submit"
                    variant="primary"
                    icon={Plus}
                    label={savingKey === 'new-membership' ? 'Adding member' : 'Add member'}
                    disabled={savingKey === 'new-membership'}
                  >
                    {savingKey === 'new-membership' ? 'Adding...' : 'Add Member'}
                  </CrudActionButton>
                </div>
              </div>
            </form>
          ) : (
            <div className="rounded-lg border border-[var(--hl-admin-border)] bg-[var(--hl-admin-surface-muted)] px-4 py-4 text-sm text-slate-600">
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
                  <button
                    type="button"
                    onClick={() => {
                      setSearchValue('');
                      setFilter('ACTIVE');
                    }}
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-sm font-semibold text-slate-400 transition hover:text-slate-700"
                    aria-label="Clear member name filter"
                    title="Clear member name filter"
                  >
                    x
                  </button>
                ) : null}
              </div>
            </label>
            <label className="admin-list-filter">
              <span className="admin-list-filter-label">Filter: Member Status</span>
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value as 'ACTIVE' | 'PENDING' | 'REJECTED' | 'REMOVED' | 'ALL')}
                className="admin-list-cell-select min-w-[11rem]"
              >
                {['ACTIVE', 'PENDING', 'REJECTED', 'REMOVED', 'ALL'].map((status) => (
                  <option key={status} value={status}>
                    {status === 'ALL' ? 'All' : formatOrganizationTypeLabel(status)}
                  </option>
                ))}
              </select>
            </label>
            <div className="text-sm text-slate-500">
              {availableCommunityUsers.length} eligible same-community user{availableCommunityUsers.length === 1 ? '' : 's'} available
            </div>
          </div>

          <div className="admin-list-table-wrap">
            <table className="admin-list-table">
              <thead className="admin-list-head">
                <tr>
                  <th className="admin-list-header-cell">Member</th>
                  <th className="admin-list-header-cell">Role</th>
                  <th className="admin-list-header-cell">Title</th>
                  <th className="admin-list-header-cell">Primary Contact</th>
                  <th className="admin-list-header-cell">Public</th>
                  <th className="admin-list-header-cell">Status</th>
                  <th className="admin-list-header-cell">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMemberships.length > 0 ? (
                  filteredMemberships.map((membership) => {
                    const targetIsOwner = membership.role === 'OWNER';
                    const canManageMembership = actorRole === 'OWNER' || !targetIsOwner;
                    const isExpanded = expandedMembershipId === membership.id;
                    const form = editingForms[membership.id] ?? buildMembershipEditFormState(membership);
                    const isSaving = savingKey === `membership-${membership.id}`;

                    return (
                      <Fragment key={membership.id}>
                        <tr className="admin-list-row">
                          <td className="admin-list-cell">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                                {getInitials(membership.user.firstName, membership.user.lastName)}
                              </div>
                              <div className="space-y-1">
                                <div className="font-semibold text-slate-950">
                                  {membership.user.firstName} {membership.user.lastName}
                                </div>
                                <div className="text-sm text-slate-500">{membership.user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="admin-list-cell">
                            {canManageMembership && editingRoleMembershipId === membership.id ? (
                              <select
                                className="admin-list-cell-select"
                                defaultValue={membership.role}
                                disabled={isSaving}
                                onBlur={() => {
                                  if (!isSaving) {
                                    setEditingRoleMembershipId(null);
                                  }
                                }}
                                onChange={(event) =>
                                  void saveMembership(membership.id, {
                                    title: membership.title || '',
                                    isPublic: membership.isPublic,
                                    isPrimaryContact: membership.isPrimaryContact,
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
                            ) : canManageMembership ? (
                              <CrudActionButton
                                type="button"
                                variant="inline"
                                icon={ListChecks}
                                label="Change role"
                                onClick={() => {
                                  setEditingRoleMembershipId(membership.id);
                                  setExpandedMembershipId(null);
                                }}
                              >
                                {formatOrganizationTypeLabel(membership.role)}
                              </CrudActionButton>
                            ) : (
                              <span className="text-sm text-slate-700">{formatOrganizationTypeLabel(membership.role)}</span>
                            )}
                          </td>
                          <td className="admin-list-cell">
                            {membership.title ? (
                              <span className="text-sm text-slate-700">{membership.title}</span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="admin-list-cell">
                            {canManageMembership ? (
                              <button
                                type="button"
                                className={`inline-flex items-center gap-1.5 text-sm font-medium ${
                                  membership.isPrimaryContact ? 'text-amber-700' : 'text-slate-500 hover:text-slate-700'
                                }`}
                                disabled={isSaving}
                                onClick={() =>
                                  void saveMembership(membership.id, {
                                    title: membership.title || '',
                                    isPublic: membership.isPublic,
                                    isPrimaryContact: !membership.isPrimaryContact,
                                  })
                                }
                              >
                                <Star
                                  className={`h-4 w-4 ${membership.isPrimaryContact ? 'fill-current' : ''}`}
                                  aria-hidden="true"
                                />
                                {membership.isPrimaryContact ? 'Primary' : 'Set Primary'}
                              </button>
                            ) : membership.isPrimaryContact ? (
                              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-700">
                                <Star className="h-4 w-4 fill-current" aria-hidden="true" />
                                Primary
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="admin-list-cell">
                            <AdminChip tone={membership.isPublic ? 'ok' : 'neu'}>
                              {membership.isPublic ? 'Public' : 'Private'}
                            </AdminChip>
                          </td>
                          <td className="admin-list-cell">
                            <AdminChip tone={getMembershipStatusTone(membership.status)}>
                              {formatOrganizationTypeLabel(membership.status)}
                            </AdminChip>
                          </td>
                          <td className="admin-list-cell">
                            <div className="flex justify-end">
                              <CrudActionButton
                                type="button"
                                variant="inline"
                                icon={isExpanded ? ChevronUp : ChevronDown}
                                label={isExpanded ? 'Collapse member editor' : 'Manage member'}
                                onClick={() => {
                                  setError('');
                                  setSuccess('');
                                  setEditingRoleMembershipId(null);
                                  setExpandedMembershipId((current) => (current === membership.id ? null : membership.id));
                                  resetMembershipForm(membership);
                                }}
                              >
                                {isExpanded ? 'Collapse' : 'Manage'}
                              </CrudActionButton>
                            </div>
                          </td>
                        </tr>
                        {isExpanded ? (
                          <tr>
                            <td colSpan={7} className="bg-[var(--hl-admin-surface-muted)] px-4 py-4">
                              <MembershipEditor
                                membership={membership}
                                form={form}
                                setForm={(value) =>
                                  setEditingForms((current) => ({
                                    ...current,
                                    [membership.id]: value,
                                  }))
                                }
                                canEditStatus={canManageMembership}
                                isSaving={isSaving}
                                onSubmit={() =>
                                  saveMembership(membership.id, {
                                    title: form.title,
                                    isPublic: form.isPublic,
                                    isPrimaryContact: membership.isPrimaryContact,
                                    status: form.status,
                                  })
                                }
                                onCancel={() => {
                                  resetMembershipForm(membership);
                                  setExpandedMembershipId(null);
                                }}
                              />
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td className="admin-list-empty" colSpan={7}>
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
