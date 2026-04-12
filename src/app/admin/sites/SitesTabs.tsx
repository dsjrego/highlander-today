'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { Globe, Plus } from 'lucide-react';

const SITE_TABS = ['all'] as const;
const SITE_PAGE_SIZE = 12;

type SiteTab = (typeof SITE_TABS)[number];
type DomainStatus = 'PENDING' | 'ACTIVE' | 'DISABLED';

interface SiteRecord {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  description: string | null;
  createdAt: Date;
  domains: Array<{
    id: string;
    domain: string;
    isPrimary: boolean;
    status: DomainStatus;
  }>;
}

interface SitesTabsProps {
  sites: SiteRecord[];
}

interface CreateSiteFormState {
  name: string;
  slug: string;
  primaryDomain: string;
  primaryDomainStatus: DomainStatus;
  description: string;
}

function formatDate(value: Date) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getDomainStatusLabel(status: DomainStatus) {
  switch (status) {
    case 'ACTIVE':
      return 'Active';
    case 'DISABLED':
      return 'Disabled';
    default:
      return 'Pending';
  }
}

export default function SitesTabs({ sites }: SitesTabsProps) {
  const [activeTab, setActiveTab] = useState<SiteTab | 'create'>('all');
  const [filterValue, setFilterValue] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rows, setRows] = useState(sites);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState<CreateSiteFormState>({
    name: '',
    slug: '',
    primaryDomain: '',
    primaryDomainStatus: 'PENDING',
    description: '',
  });

  const normalizedFilter = filterValue.trim().toLowerCase();
  const filteredSites = useMemo(
    () =>
      rows.filter((site) => {
        if (!normalizedFilter) {
          return true;
        }

        return (
          site.name.toLowerCase().includes(normalizedFilter) ||
          site.slug.toLowerCase().includes(normalizedFilter) ||
          site.domain?.toLowerCase().includes(normalizedFilter) ||
          site.domains.some((domain) => domain.domain.toLowerCase().includes(normalizedFilter))
        );
      }),
    [normalizedFilter, rows]
  );

  const pageCount = Math.max(1, Math.ceil(filteredSites.length / SITE_PAGE_SIZE));
  const safePage = Math.min(currentPage, pageCount);
  const pageStart = (safePage - 1) * SITE_PAGE_SIZE;
  const pageSites = filteredSites.slice(pageStart, pageStart + SITE_PAGE_SIZE);

  function handleCreateInputChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = event.target;

    setCreateForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleCreateSite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError('');
    setCreateSuccess('');

    if (!createForm.name.trim()) {
      setCreateError('Site name is required.');
      return;
    }

    if (!createForm.slug.trim()) {
      setCreateError('Slug is required.');
      return;
    }

    setIsCreating(true);

    try {
      const response = await fetch('/api/admin/sites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createForm),
      });

      const data = await response.json();

      if (!response.ok) {
        const validationMessage = Array.isArray(data.details)
          ? data.details
              .map((detail: { message?: string }) => detail.message)
              .filter(Boolean)
              .join(', ')
          : '';
        throw new Error(validationMessage || data.error || 'Failed to create site');
      }

      const nextSite: SiteRecord = {
        ...data.site,
        createdAt: new Date(data.site.createdAt),
      };

      setRows((current) => [nextSite, ...current]);
      setCreateForm({
        name: '',
        slug: '',
        primaryDomain: '',
        primaryDomainStatus: 'PENDING',
        description: '',
      });
      setCreateSuccess('Site created successfully.');
      setActiveTab('all');
      setCurrentPage(1);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Failed to create site');
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="space-y-0">
      <div className="relative top-[2px] flex flex-wrap gap-0 pb-0">
        {SITE_TABS.map((tab) => {
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
              All Sites
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
          Site
        </button>
      </div>

      <div className="admin-card-tab-body">
        {activeTab === 'create' ? (
          <form onSubmit={handleCreateSite} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
            <div>
              <h3 className="text-lg font-bold text-slate-950">Add Site</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Create a tenant community record with an optional primary domain. Theme manifests remain code-owned,
                but this establishes the real site identity and domain-routing record.
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
                  <label className="form-label text-slate-500">Site Name</label>
                  <input
                    type="text"
                    name="name"
                    value={createForm.name}
                    onChange={handleCreateInputChange}
                    className="form-input border-slate-300 bg-white text-slate-950"
                    placeholder="River Valley Local"
                  />
                </div>

                <div>
                  <label className="form-label text-slate-500">Slug</label>
                  <input
                    type="text"
                    name="slug"
                    value={createForm.slug}
                    onChange={handleCreateInputChange}
                    className="form-input border-slate-300 bg-white text-slate-950"
                    placeholder="river-valley-local"
                  />
                </div>

                <div>
                  <label className="form-label text-slate-500">Primary Domain</label>
                  <input
                    type="text"
                    name="primaryDomain"
                    value={createForm.primaryDomain}
                    onChange={handleCreateInputChange}
                    className="form-input border-slate-300 bg-white text-slate-950"
                    placeholder="rivervalleylocal.org"
                  />
                </div>

                <div>
                  <label className="form-label text-slate-500">Primary Domain Status</label>
                  <select
                    name="primaryDomainStatus"
                    value={createForm.primaryDomainStatus}
                    onChange={handleCreateInputChange}
                    className="form-input border-slate-300 bg-white text-slate-950"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="ACTIVE">Active</option>
                    <option value="DISABLED">Disabled</option>
                  </select>
                </div>

                <div className="lg:col-span-2">
                  <label className="form-label text-slate-500">Description</label>
                  <textarea
                    name="description"
                    value={createForm.description}
                    onChange={handleCreateInputChange}
                    className="form-textarea border-slate-300 bg-white text-slate-950"
                    rows={4}
                    placeholder="Short internal description of this tenant/community."
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
              Creating a site here provisions the database record and optional primary domain only. Tenant theme manifests,
              metadata, and coverage setup still need to be added separately where required.
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('all');
                  setCreateError('');
                  setCreateSuccess('');
                }}
                className="btn-neutral"
              >
                Cancel
              </button>
              <button type="submit" disabled={isCreating} className="btn-primary">
                {isCreating ? 'Creating...' : 'Create Site'}
              </button>
            </div>
          </form>
        ) : (
          <div className="admin-list">
            <div className="admin-list-toolbar">
              <label className="admin-list-filter">
                <span className="admin-list-filter-label">Filter: Name, Slug, Domain</span>
                <input
                  type="text"
                  value={filterValue}
                  onChange={(event) => {
                    setFilterValue(event.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search by site name, slug, or domain"
                  className="admin-list-filter-input"
                />
              </label>
            </div>

            <div className="admin-list-table-wrap">
              <table className="admin-list-table">
                <thead className="admin-list-head">
                  <tr>
                    <th className="admin-list-header-cell">Site</th>
                    <th className="admin-list-header-cell">Primary Domain</th>
                    <th className="admin-list-header-cell">Domains</th>
                    <th className="admin-list-header-cell">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {pageSites.length > 0 ? (
                    pageSites.map((site) => {
                      const primaryDomain = site.domains.find((domain) => domain.isPrimary) ?? null;

                      return (
                        <tr key={site.id} className="admin-list-row">
                          <td className="admin-list-cell">
                            <div className="flex items-start gap-2">
                              <div className="mt-0.5 text-slate-500" aria-hidden="true">
                                <Globe className="h-4 w-4" />
                              </div>
                              <div>
                                <Link href={`/admin/sites/${site.id}`} className="admin-list-link">
                                  {site.name}
                                </Link>
                              </div>
                            </div>
                          </td>
                          <td className="admin-list-cell">
                            {primaryDomain ? (
                              <div>
                                <div className="font-medium text-slate-900">{primaryDomain.domain}</div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {getDomainStatusLabel(primaryDomain.status)}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-500">Not set</span>
                            )}
                          </td>
                          <td className="admin-list-cell">
                            {site.domains.length > 0 ? (
                              <div className="space-y-1">
                                {site.domains.map((domain) => (
                                  <div key={domain.id} className="text-xs text-slate-600">
                                    {domain.domain}
                                    {domain.isPrimary ? ' · primary' : ''}
                                    {' · '}
                                    {getDomainStatusLabel(domain.status)}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-500">No tenant-domain records</span>
                            )}
                          </td>
                          <td className="admin-list-cell">{formatDate(site.createdAt)}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td className="admin-list-empty" colSpan={4}>
                        No sites match the current filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="admin-list-pagination">
              <div className="admin-list-pagination-label">
                {filteredSites.length} site{filteredSites.length === 1 ? '' : 's'}
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
