'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { Building2, ListChecks, Plus, Settings2 } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CrudActionButton, CrudActionLink } from '@/components/shared/CrudAction';
import { AdminChip } from '@/components/admin/AdminChip';
import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminFilterBar } from '@/components/admin/AdminFilterBar';
import { AdminViewTabs } from '@/components/admin/AdminViewTabs';
import {
  ORGANIZATION_GROUP_OPTIONS,
  ORGANIZATION_TYPE_OPTIONS,
  type OrganizationDirectoryGroup,
} from '@/lib/organization-taxonomy';

const TipTapEditor = dynamic(() => import('@/components/articles/TipTapEditor'), {
  ssr: false,
});

const ORGANIZATION_TABS = ['pending', 'approved', 'rejected', 'suspended'] as const;
const ORGANIZATION_PAGE_SIZE = 10;
const ORGANIZATION_STATUS_OPTIONS = [
  { value: 'APPROVED', label: 'Approved', tone: 'ok' },
  { value: 'REJECTED', label: 'Rejected', tone: 'bad' },
  { value: 'SUSPENDED', label: 'Suspended', tone: 'bad' },
] as const;

type OrganizationTab = (typeof ORGANIZATION_TABS)[number];

interface OrganizationRecord {
  id: string;
  name: string;
  slug: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  directoryGroup: 'BUSINESS' | 'GOVERNMENT' | 'ORGANIZATION';
  organizationType: string;
  updatedAt: Date;
  createdAt: Date;
  createdBy: {
    firstName: string;
    lastName: string;
  };
  _count: {
    memberships: number;
    locations: number;
    departments: number;
    contacts: number;
  };
}

interface OrganizationTabsProps {
  organizations: OrganizationRecord[];
}

interface CreateOrganizationFormState {
  name: string;
  directoryGroup: OrganizationRecord['directoryGroup'];
  organizationType: string;
  description: string;
  websiteUrl: string;
  status: OrganizationRecord['status'];
}

function getStatusForTab(tab: OrganizationTab): OrganizationRecord['status'] {
  switch (tab) {
    case 'pending':
      return 'PENDING_APPROVAL';
    case 'rejected':
      return 'REJECTED';
    case 'suspended':
      return 'SUSPENDED';
    default:
      return 'APPROVED';
  }
}

function getTabLabel(tab: string) {
  return tab.charAt(0).toUpperCase() + tab.slice(1);
}

function formatDate(value: Date) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTypeLabel(value: string) {
  return value
    .split('_')
    .map((segment) => segment.charAt(0) + segment.slice(1).toLowerCase())
    .join(' ');
}

function getStatusMeta(status: OrganizationRecord['status']) {
  if (status === 'PENDING_APPROVAL') {
    return { label: 'Pending', tone: 'pend' as const };
  }

  return (
    ORGANIZATION_STATUS_OPTIONS.find((option) => option.value === status) ?? {
      label: 'Status',
      tone: 'neu' as const,
    }
  );
}

export default function OrganizationTabs({ organizations }: OrganizationTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get('view') as OrganizationTab) || 'pending';
  const focus = searchParams.get('focus');

  const [filterValue, setFilterValue] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rows, setRows] = useState(organizations);
  const [savingStatusOrganizationId, setSavingStatusOrganizationId] = useState<string | null>(null);
  const [statusError, setStatusError] = useState('');
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState<CreateOrganizationFormState>({
    name: '',
    directoryGroup: 'ORGANIZATION' as OrganizationRecord['directoryGroup'],
    organizationType: ORGANIZATION_TYPE_OPTIONS.ORGANIZATION[0].value,
    description: '',
    websiteUrl: '',
    status: 'PENDING_APPROVAL' as OrganizationRecord['status'],
  });

  const normalizedFilter = filterValue.trim().toLowerCase();
  const currentStatus = getStatusForTab(activeTab);
  const filteredOrganizations = rows.filter((organization) => {
    if (organization.status !== currentStatus) {
      return false;
    }

    if (!normalizedFilter) {
      return true;
    }

    return (
      organization.name.toLowerCase().includes(normalizedFilter) ||
      organization.organizationType.toLowerCase().includes(normalizedFilter) ||
      organization.directoryGroup.toLowerCase().includes(normalizedFilter) ||
      organization.createdBy.lastName.toLowerCase().includes(normalizedFilter)
    );
  });

  const pageCount = Math.max(1, Math.ceil(filteredOrganizations.length / ORGANIZATION_PAGE_SIZE));
  const safePage = Math.min(currentPage, pageCount);
  const pageStart = (safePage - 1) * ORGANIZATION_PAGE_SIZE;
  const pageOrganizations = filteredOrganizations.slice(pageStart, pageStart + ORGANIZATION_PAGE_SIZE);
  const focusedOrganization = focus && focus !== 'new' ? rows.find((organization) => organization.id === focus) ?? null : null;

  function updateSearchParams(updates: Record<string, string | null>) {
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
  }

  function handleFilterChange(value: string) {
    setFilterValue(value);
    setCurrentPage(1);
  }

  function handleCreateInputChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = event.target;
    if (name === 'directoryGroup') {
      const nextGroup = value as OrganizationDirectoryGroup;
      setCreateForm((current) => ({
        ...current,
        directoryGroup: nextGroup,
        organizationType: ORGANIZATION_TYPE_OPTIONS[nextGroup][0].value,
      }));
      return;
    }

    setCreateForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleCreateOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError('');
    setCreateSuccess('');

    if (!createForm.name.trim()) {
      setCreateError('Organization name is required.');
      return;
    }

    setIsCreating(true);

    try {
      const response = await fetch('/api/admin/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...createForm,
          organizationType: createForm.organizationType.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const validationMessage = Array.isArray(data.details)
          ? data.details
              .map((detail: { message?: string }) => detail.message)
              .filter(Boolean)
              .join(', ')
          : '';
        throw new Error(validationMessage || data.error || 'Failed to create organization');
      }

      setRows((current) => [
        {
          ...data.organization,
          updatedAt: new Date(data.organization.updatedAt),
          createdAt: new Date(data.organization.createdAt),
        },
        ...current,
      ]);
      setCreateForm({
        name: '',
        directoryGroup: 'ORGANIZATION',
        organizationType: ORGANIZATION_TYPE_OPTIONS.ORGANIZATION[0].value,
        description: '',
        websiteUrl: '',
        status: 'PENDING_APPROVAL',
      });
      setCreateSuccess('Organization created successfully.');
      const nextTab =
        data.organization.status === 'APPROVED'
          ? 'approved'
          : data.organization.status === 'REJECTED'
            ? 'rejected'
            : data.organization.status === 'SUSPENDED'
              ? 'suspended'
              : 'pending';
      updateSearchParams({ view: nextTab, focus: data.organization.id });
      setCurrentPage(1);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Failed to create organization');
    } finally {
      setIsCreating(false);
    }
  }

  async function handleStatusChange(
    organizationId: string,
    nextStatus: 'APPROVED' | 'REJECTED' | 'SUSPENDED'
  ) {
    setSavingStatusOrganizationId(organizationId);
    setStatusError('');

    try {
      const response = await fetch(`/api/admin/organizations/${organizationId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update status');
      }

      setRows((current) =>
        current.map((organization) =>
          organization.id === organizationId
            ? {
                ...organization,
                status: data.status,
              }
            : organization
        )
      );
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : 'Failed to update status');
    } finally {
      setSavingStatusOrganizationId(null);
    }
  }

  const createTypeOptions = ORGANIZATION_TYPE_OPTIONS[createForm.directoryGroup];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <AdminViewTabs
          defaultView="pending"
          views={ORGANIZATION_TABS.map((tab) => ({
            key: tab,
            label: getTabLabel(tab),
            count: rows.filter((organization) => organization.status === getStatusForTab(tab)).length,
            tone: tab === 'pending' ? 'pend' : tab === 'rejected' || tab === 'suspended' ? 'bad' : undefined,
          }))}
        />
        <button
          type="button"
          className="page-header-action"
          onClick={() => updateSearchParams({ focus: 'new' })}
        >
          <Plus className="h-4 w-4" />
          <span>Organization</span>
        </button>
      </div>

      <div className="admin-list">
        <AdminFilterBar
          search={
            <label className="admin-list-filter">
              <span className="admin-list-filter-label">Name, Type, Group, Submitter</span>
              <input
                type="text"
                value={filterValue}
                onChange={(event) => handleFilterChange(event.target.value)}
                placeholder="Search by organization name, type, group, or submitter last name"
                className="admin-list-filter-input"
              />
            </label>
          }
          right={
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              {filteredOrganizations.length} {getTabLabel(activeTab).toLowerCase()} organization{filteredOrganizations.length === 1 ? '' : 's'}
            </div>
          }
        />

        {statusError ? <div className="admin-list-error">{statusError}</div> : null}
        {createError && focus === 'new' ? <div className="admin-list-error">{createError}</div> : null}
        {createSuccess && focus === 'new' ? (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-700">
            {createSuccess}
          </div>
        ) : null}

        <div className="admin-list-table-wrap">
          <table className="admin-list-table">
            <thead className="admin-list-head">
              <tr>
                <th className="admin-list-header-cell">Name</th>
                <th className="admin-list-header-cell">Group / Type</th>
                <th className="admin-list-header-cell">Created By</th>
                <th className="admin-list-header-cell">Structure</th>
                <th className="admin-list-header-cell">Updated</th>
                <th className="admin-list-header-cell">Status</th>
                <th className="admin-list-header-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageOrganizations.length > 0 ? (
                pageOrganizations.map((organization) => {
                  const statusMeta = getStatusMeta(organization.status);

                  return (
                    <tr key={organization.id} className="admin-list-row">
                      <td className="admin-list-cell">
                        <Link href={`/admin/organizations/${organization.id}`} className="admin-list-link">
                          {organization.name}
                        </Link>
                      </td>
                      <td className="admin-list-cell">
                        {formatTypeLabel(organization.directoryGroup)} / {formatTypeLabel(organization.organizationType)}
                      </td>
                      <td className="admin-list-cell">
                        {organization.createdBy.firstName} {organization.createdBy.lastName}
                      </td>
                      <td className="admin-list-cell">
                        {organization._count.locations} loc / {organization._count.departments} dept / {organization._count.contacts} contact
                      </td>
                      <td className="admin-list-cell">{formatDate(organization.updatedAt)}</td>
                      <td className="admin-list-cell">
                        <AdminChip tone={statusMeta.tone}>{statusMeta.label}</AdminChip>
                      </td>
                      <td className="admin-list-cell">
                        <div className="flex flex-wrap gap-3">
                          <CrudActionLink
                            href={`/admin/organizations/${organization.id}`}
                            variant="inline-link"
                            icon={Building2}
                            label="Open organization"
                          >
                            Open
                          </CrudActionLink>
                          <CrudActionButton
                            type="button"
                            variant="inline"
                            icon={Settings2}
                            label="Manage organization"
                            onClick={() => updateSearchParams({ focus: organization.id })}
                          >
                            Manage
                          </CrudActionButton>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="admin-list-empty" colSpan={7}>
                    No {activeTab} organizations match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="admin-list-pagination">
          <div className="admin-list-pagination-label">
            {filteredOrganizations.length} {getTabLabel(activeTab).toLowerCase()} organization
            {filteredOrganizations.length === 1 ? '' : 's'}
          </div>
          <div className="admin-list-pagination-actions">
            <button
              type="button"
              onClick={() => setCurrentPage((current) => Math.max(1, current - 1))}
              disabled={safePage === 1}
              className="admin-list-pagination-button"
            >
              Previous
            </button>
            <span className="admin-list-pagination-page">
              Page {safePage} of {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((current) => Math.min(pageCount, current + 1))}
              disabled={safePage === pageCount}
              className="admin-list-pagination-button"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <AdminDrawer
        title={
          focus === 'new'
            ? 'Create Organization'
            : focusedOrganization
              ? `Manage ${focusedOrganization.name}`
              : 'Manage Organization'
        }
      >
        {focus === 'new' ? (
          <form onSubmit={handleCreateOrganization} className="space-y-5">
            <div>
              <h3 className="text-lg font-bold text-slate-950">Add Organization</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Create the base organization record directly from admin. Add locations, departments,
                contacts, roster visibility, and media from the organization detail page after creation.
              </p>
            </div>

            {createError ? <div className="admin-list-error">{createError}</div> : null}
            {createSuccess ? (
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-700">
                {createSuccess}
              </div>
            ) : null}

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <label className="form-label text-slate-500">Organization Name</label>
                  <input
                    type="text"
                    name="name"
                    value={createForm.name}
                    onChange={handleCreateInputChange}
                    className="form-input border-slate-300 bg-white text-slate-950"
                    placeholder="Cambria County Planning Office"
                  />
                </div>

                <div>
                  <label className="form-label text-slate-500">Organization Type</label>
                  <select
                    name="organizationType"
                    value={createForm.organizationType}
                    onChange={handleCreateInputChange}
                    className="form-input border-slate-300 bg-white text-slate-950"
                  >
                    {createTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label text-slate-500">Directory Group</label>
                  <select
                    name="directoryGroup"
                    value={createForm.directoryGroup}
                    onChange={handleCreateInputChange}
                    className="form-input border-slate-300 bg-white text-slate-950"
                  >
                    {ORGANIZATION_GROUP_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label text-slate-500">Initial Status</label>
                  <select
                    name="status"
                    value={createForm.status}
                    onChange={handleCreateInputChange}
                    className="form-input border-slate-300 bg-white text-slate-950"
                  >
                    <option value="PENDING_APPROVAL">Pending Approval</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                </div>

                <div className="lg:col-span-2">
                  <label className="form-label text-slate-500">Website</label>
                  <input
                    type="url"
                    name="websiteUrl"
                    value={createForm.websiteUrl}
                    onChange={handleCreateInputChange}
                    className="form-input border-slate-300 bg-white text-slate-950"
                    placeholder="https://example.org"
                  />
                </div>

                <div className="lg:col-span-2">
                  <label className="form-label text-slate-500">Description</label>
                  <TipTapEditor
                    content={createForm.description}
                    onChange={(description) =>
                      setCreateForm((current) => ({
                        ...current,
                        description,
                      }))
                    }
                    placeholder="Describe the organization, what it does, and how it serves the community."
                  />
                </div>
              </div>
            </div>

            <div className="form-card-actions">
              <CrudActionButton
                type="submit"
                variant="primary"
                icon={Building2}
                label={isCreating ? 'Creating organization' : 'Create Organization'}
                disabled={isCreating}
              >
                {isCreating ? 'Creating...' : 'Create Organization'}
              </CrudActionButton>
            </div>
          </form>
        ) : focusedOrganization ? (
          <div className="space-y-5">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <AdminChip tone={getStatusMeta(focusedOrganization.status).tone}>
                  {getStatusMeta(focusedOrganization.status).label}
                </AdminChip>
                <AdminChip tone="role">{formatTypeLabel(focusedOrganization.directoryGroup)}</AdminChip>
              </div>
              <div className="mt-3 space-y-1 text-sm text-slate-600">
                <p>{formatTypeLabel(focusedOrganization.organizationType)}</p>
                <p>
                  Created by {focusedOrganization.createdBy.firstName} {focusedOrganization.createdBy.lastName}
                </p>
                <p>Updated: {formatDate(focusedOrganization.updatedAt)}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Status</p>
              <select
                className="admin-list-cell-select min-w-[14rem]"
                value={focusedOrganization.status === 'PENDING_APPROVAL' ? 'PENDING_APPROVAL' : focusedOrganization.status}
                disabled={savingStatusOrganizationId === focusedOrganization.id}
                onChange={(event) => {
                  if (event.target.value === 'PENDING_APPROVAL') {
                    return;
                  }

                  handleStatusChange(
                    focusedOrganization.id,
                    event.target.value as 'APPROVED' | 'REJECTED' | 'SUSPENDED'
                  );
                }}
              >
                {focusedOrganization.status === 'PENDING_APPROVAL' ? (
                  <option value="PENDING_APPROVAL">Pending</option>
                ) : null}
                {ORGANIZATION_STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <p>
                {focusedOrganization._count.locations} locations, {focusedOrganization._count.departments} departments,
                {` ${focusedOrganization._count.contacts} contacts, ${focusedOrganization._count.memberships} memberships`}
              </p>
            </div>

            <CrudActionLink
              href={`/admin/organizations/${focusedOrganization.id}`}
              variant="inline-link"
              icon={ListChecks}
              label="Open full organization editor"
            >
              Open full editor
            </CrudActionLink>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
            The selected organization is not available in the current result set.
          </div>
        )}
      </AdminDrawer>
    </div>
  );
}
