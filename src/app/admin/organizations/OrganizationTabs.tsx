'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { Plus } from 'lucide-react';
import {
  ORGANIZATION_GROUP_OPTIONS,
  ORGANIZATION_TYPE_OPTIONS,
  type OrganizationDirectoryGroup,
} from '@/lib/organization-taxonomy';

const ORGANIZATION_TABS = ['pending', 'approved', 'rejected', 'suspended'] as const;
const ORGANIZATION_PAGE_SIZE = 10;
const ORGANIZATION_STATUS_OPTIONS = [
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'SUSPENDED', label: 'Suspended' },
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
  contactEmail: string;
  contactPhone: string;
  isPublicMemberRoster: boolean;
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

function getTabLabel(tab: OrganizationTab) {
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

function formatPhoneInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 10);

  if (digits.length === 0) {
    return '';
  }

  if (digits.length < 4) {
    return `(${digits}`;
  }

  if (digits.length < 7) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  }

  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function hasValidPhoneDigits(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits.length === 0 || digits.length === 10;
}

export default function OrganizationTabs({ organizations }: OrganizationTabsProps) {
  const [activeTab, setActiveTab] = useState<OrganizationTab | 'create'>('pending');
  const [filterValue, setFilterValue] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rows, setRows] = useState(organizations);
  const [editingStatusOrganizationId, setEditingStatusOrganizationId] = useState<string | null>(null);
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
    contactEmail: '',
    contactPhone: '',
    isPublicMemberRoster: false,
    status: 'PENDING_APPROVAL' as OrganizationRecord['status'],
  });

  const normalizedFilter = filterValue.trim().toLowerCase();
  const currentStatus = activeTab === 'create' ? null : getStatusForTab(activeTab);
  const filteredOrganizations = rows.filter((organization) => {
    if (!currentStatus || organization.status !== currentStatus) {
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

    if (name === 'contactPhone') {
      setCreateForm((current) => ({
        ...current,
        contactPhone: formatPhoneInput(value),
      }));
      return;
    }

    setCreateForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleCreateCheckboxChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { name, checked } = event.target;
    setCreateForm((current) => ({
      ...current,
      [name]: checked,
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

    if (!hasValidPhoneDigits(createForm.contactPhone)) {
      setCreateError('Contact phone must include 10 digits.');
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
        contactEmail: '',
        contactPhone: '',
        isPublicMemberRoster: false,
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
      setActiveTab(nextTab);
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
      setEditingStatusOrganizationId(null);
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : 'Failed to update status');
    } finally {
      setSavingStatusOrganizationId(null);
    }
  }

  const createTypeOptions = ORGANIZATION_TYPE_OPTIONS[createForm.directoryGroup];

  return (
    <div className="space-y-0">
      <div className="relative top-[2px] flex flex-wrap gap-0 pb-0">
        {ORGANIZATION_TABS.map((tab) => {
          const isActive = tab === activeTab;

          return (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setActiveTab(tab);
                setCurrentPage(1);
              }}
              className={`admin-card-tab ${isActive ? 'admin-card-tab-active' : 'admin-card-tab-inactive'}`}
            >
              {tab}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => {
            setActiveTab('create');
            setCurrentPage(1);
          }}
          className={`admin-card-tab inline-flex items-center gap-2 ${
            activeTab === 'create' ? 'admin-card-tab-active' : 'admin-card-tab-inactive'
          }`}
        >
          <Plus className="h-3.5 w-3.5" />
          Organization
        </button>
      </div>

      <div className="admin-card-tab-body">
        {activeTab === 'create' ? (
          <form onSubmit={handleCreateOrganization} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
            <div>
              <h3 className="text-lg font-bold text-slate-950">Add Organization</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Create an organization record directly from admin. The creator is attached as the
                initial owner membership automatically.
              </p>
            </div>

            {createError ? <div className="admin-list-error">{createError}</div> : null}
            {createSuccess ? (
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-700">
                {createSuccess}
              </div>
            ) : null}

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

              <div>
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

              <div>
                <label className="form-label text-slate-500">Contact Email</label>
                <input
                  type="email"
                  name="contactEmail"
                  value={createForm.contactEmail}
                  onChange={handleCreateInputChange}
                  className="form-input border-slate-300 bg-white text-slate-950"
                  placeholder="office@example.org"
                />
              </div>

              <div>
                <label className="form-label text-slate-500">Contact Phone</label>
                <input
                  type="text"
                  name="contactPhone"
                  value={createForm.contactPhone}
                  onChange={handleCreateInputChange}
                  className="form-input border-slate-300 bg-white text-slate-950"
                  placeholder="(555) 123-4567"
                />
              </div>

              <div className="flex items-center">
                <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    name="isPublicMemberRoster"
                    checked={createForm.isPublicMemberRoster}
                    onChange={handleCreateCheckboxChange}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Public member roster
                </label>
              </div>
            </div>

            <div>
              <label className="form-label text-slate-500">Description</label>
              <textarea
                name="description"
                value={createForm.description}
                onChange={handleCreateInputChange}
                rows={5}
                className="form-textarea border-slate-300 bg-white text-slate-950"
                placeholder="Describe the organization, what it does, and how it serves the community."
              />
            </div>

            <div className="form-card-actions">
              <button type="submit" disabled={isCreating} className="btn btn-primary">
                {isCreating ? 'Creating...' : 'Create Organization'}
              </button>
            </div>
          </form>
        ) : (
        <div className="admin-list">
          <div className="admin-list-toolbar">
            <label className="admin-list-filter">
              <span className="admin-list-filter-label">Filter: Name, Type, Group, Submitter</span>
              <input
                type="text"
                value={filterValue}
                onChange={(event) => handleFilterChange(event.target.value)}
                placeholder="Search by organization name, type, group, or submitter last name"
                className="admin-list-filter-input"
              />
            </label>
          </div>

          {statusError ? <div className="admin-list-error">{statusError}</div> : null}

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
                </tr>
              </thead>
              <tbody>
                {pageOrganizations.length > 0 ? (
                  pageOrganizations.map((organization) => (
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
                        {editingStatusOrganizationId === organization.id ? (
                          <select
                            className="admin-list-cell-select"
                            defaultValue={organization.status}
                            disabled={savingStatusOrganizationId === organization.id}
                            onBlur={() => {
                              if (savingStatusOrganizationId !== organization.id) {
                                setEditingStatusOrganizationId(null);
                              }
                            }}
                            onChange={(event) =>
                              handleStatusChange(
                                organization.id,
                                event.target.value as 'APPROVED' | 'REJECTED' | 'SUSPENDED'
                              )
                            }
                            autoFocus
                          >
                            {organization.status === 'PENDING_APPROVAL' ? (
                              <option value="PENDING_APPROVAL" disabled>
                                Pending
                              </option>
                            ) : null}
                            {ORGANIZATION_STATUS_OPTIONS.map((status) => (
                              <option key={status.value} value={status.value}>
                                {status.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <button
                            type="button"
                            className="admin-list-cell-button"
                            onClick={() => setEditingStatusOrganizationId(organization.id)}
                          >
                            {organization.status === 'PENDING_APPROVAL'
                              ? 'Pending'
                              : ORGANIZATION_STATUS_OPTIONS.find((status) => status.value === organization.status)?.label}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="admin-list-empty" colSpan={6}>
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
        )}
      </div>
    </div>
  );
}
