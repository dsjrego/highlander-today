/* eslint-disable @next/next/no-img-element */

'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Ban,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Search,
  X,
} from 'lucide-react';
import { AdminPage } from '@/components/admin/AdminPage';
import { AdminSection } from '@/components/admin/AdminSection';
import { AdminTable } from '@/components/admin/AdminTable';
import { AdminChip } from '@/components/admin/AdminChip';
import { AdminFacet, AdminFilterBar } from '@/components/admin/AdminFilterBar';
import {
  CrudActionButton,
  CrudActionLink,
} from '@/components/shared/CrudAction';
import ConfirmDialog from '@/components/shared/ConfirmDialog';

interface StoreRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  websiteUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  owner: {
    id: string;
    firstName: string;
    lastName: string;
    trustLevel: string;
  };
  approvedBy: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  _count: {
    listings: number;
  };
}

interface StoreCounts {
  all: number;
  pending: number;
  approved: number;
  rejected: number;
  suspended: number;
}

const STATUS_META = {
  PENDING_APPROVAL: { label: 'Pending', tone: 'pend' },
  APPROVED: { label: 'Approved', tone: 'ok' },
  REJECTED: { label: 'Rejected', tone: 'bad' },
  SUSPENDED: { label: 'Suspended', tone: 'bad' },
} as const;

function formatDate(value: string | null) {
  if (!value) {
    return 'Not yet';
  }

  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function AdminStoresPage() {
  const [stores, setStores] = useState<StoreRecord[]>([]);
  const [counts, setCounts] = useState<StoreCounts>({
    all: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    suspended: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState<
    'ALL' | StoreRecord['status']
  >('ALL');
  const [expandedStoreId, setExpandedStoreId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [statusTarget, setStatusTarget] = useState<{
    id: string;
    nextStatus: 'APPROVED' | 'REJECTED' | 'SUSPENDED';
    label: string;
  } | null>(null);
  const [statusReason, setStatusReason] = useState('');

  useEffect(() => {
    async function fetchStores() {
      setIsLoading(true);
      setError('');

      try {
        const params = new URLSearchParams();
        if (activeFilter !== 'ALL') {
          params.set('status', activeFilter);
        }
        if (searchQuery.trim()) {
          params.set('q', searchQuery.trim());
        }

        const queryString = params.toString();
        const res = await fetch(
          `/api/admin/stores${queryString ? `?${queryString}` : ''}`,
        );
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch stores');
        }

        setStores(data.stores || []);
        setCounts(
          data.counts || {
            all: 0,
            pending: 0,
            approved: 0,
            rejected: 0,
            suspended: 0,
          },
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch stores');
      } finally {
        setIsLoading(false);
      }
    }

    fetchStores();
  }, [activeFilter, searchQuery, refreshKey]);

  const filterButtons = useMemo(
    () => [
      { value: 'ALL' as const, label: 'All', count: counts.all },
      {
        value: 'PENDING_APPROVAL' as const,
        label: 'Pending',
        count: counts.pending,
      },
      { value: 'APPROVED' as const, label: 'Approved', count: counts.approved },
      { value: 'REJECTED' as const, label: 'Rejected', count: counts.rejected },
      {
        value: 'SUSPENDED' as const,
        label: 'Suspended',
        count: counts.suspended,
      },
    ],
    [counts],
  );

  async function updateStoreStatus(
    storeId: string,
    nextStatus: 'APPROVED' | 'REJECTED' | 'SUSPENDED',
  ) {
    setActionLoading(storeId);

    try {
      const res = await fetch(`/api/admin/stores/${storeId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: nextStatus,
          reason: statusReason.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update store');
      }

      setStatusTarget(null);
      setStatusReason('');
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update store');
    } finally {
      setActionLoading(null);
    }
  }

  function openStatusChange(
    store: StoreRecord,
    nextStatus: 'APPROVED' | 'REJECTED' | 'SUSPENDED',
    label: string,
  ) {
    setError('');
    setStatusReason('');
    setStatusTarget({ id: store.id, nextStatus, label });
  }

  function renderActions(store: StoreRecord) {
    const isProcessing = actionLoading === store.id;
    return (
      <div className="admin-row-actions">
        <CrudActionButton
          type="button"
          variant="inline"
          icon={expandedStoreId === store.id ? ChevronUp : ChevronDown}
          label={
            expandedStoreId === store.id
              ? 'Close store details'
              : 'Review store'
          }
          aria-expanded={expandedStoreId === store.id}
          aria-controls={`store-details-${store.id}`}
          onClick={() =>
            setExpandedStoreId((current) =>
              current === store.id ? null : store.id,
            )
          }
        />
        {store.status === 'APPROVED' ? (
          <>
            <CrudActionLink
              href={`/marketplace/stores/${store.id}`}
              icon={ExternalLink}
              label="View storefront"
            />
            <CrudActionButton
              type="button"
              variant="inline-danger"
              icon={Ban}
              label="Suspend store"
              disabled={isProcessing}
              onClick={() =>
                openStatusChange(store, 'SUSPENDED', 'Suspend store')
              }
            />
          </>
        ) : (
          <CrudActionButton
            type="button"
            variant="inline-success"
            icon={Check}
            label="Approve store"
            disabled={isProcessing}
            onClick={() => openStatusChange(store, 'APPROVED', 'Approve store')}
          />
        )}
        {store.status === 'PENDING_APPROVAL' ? (
          <CrudActionButton
            type="button"
            variant="inline-danger"
            icon={X}
            label="Reject store"
            disabled={isProcessing}
            onClick={() => openStatusChange(store, 'REJECTED', 'Reject store')}
          />
        ) : null}
      </div>
    );
  }

  return (
    <AdminPage title="Stores" count={counts.all}>
      <AdminSection title="Store directory">
        <AdminFilterBar
          search={
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setSearchQuery(searchInput);
              }}
              className="admin-search-form"
            >
              <label className="admin-list-filter">
                <span className="admin-list-filter-label">
                  Store, owner or email
                </span>
                <input
                  type="search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search store name, slug, owner or email"
                  className="admin-list-filter-input"
                />
              </label>
              <CrudActionButton
                type="submit"
                variant="inline"
                icon={Search}
                label="Search stores"
              />
              {searchQuery || searchInput ? (
                <CrudActionButton
                  type="button"
                  variant="inline"
                  icon={X}
                  label="Clear search"
                  onClick={() => {
                    setSearchInput('');
                    setSearchQuery('');
                  }}
                />
              ) : null}
            </form>
          }
          right={
            <span className="admin-list-pagination-label">
              {stores.length} results
            </span>
          }
        >
          {filterButtons.map((filter) => (
            <AdminFacet
              key={filter.value}
              active={activeFilter === filter.value}
              onClick={() => {
                setExpandedStoreId(null);
                setActiveFilter(filter.value);
              }}
            >
              {filter.label}{' '}
              <span className="admin-section-count">{filter.count}</span>
            </AdminFacet>
          ))}
        </AdminFilterBar>
        {error && !statusTarget ? (
          <p role="alert" className="admin-list-error">
            {error}
          </p>
        ) : null}
        <div aria-busy={isLoading} className="admin-section-body">
          <AdminTable
            label="Stores"
            rows={isLoading ? [] : stores}
            rowKey={(store) => store.id}
            emptyMessage={
              isLoading
                ? 'Loading stores…'
                : 'No stores match the current filters.'
            }
            expandedRowKey={expandedStoreId}
            columns={[
              {
                key: 'store',
                label: 'Store',
                render: (store) => (
                  <>
                    <button
                      type="button"
                      className="admin-list-link"
                      aria-expanded={expandedStoreId === store.id}
                      aria-controls={`store-details-${store.id}`}
                      onClick={() =>
                        setExpandedStoreId((current) =>
                          current === store.id ? null : store.id,
                        )
                      }
                    >
                      {store.name}
                    </button>
                    <div className="admin-list-secondary">/{store.slug}</div>
                  </>
                ),
              },
              {
                key: 'owner',
                label: 'Owner',
                render: (store) => (
                  <>
                    {store.owner.firstName} {store.owner.lastName}
                    <div className="admin-list-secondary">
                      {store.owner.trustLevel === 'TRUSTED'
                        ? 'Trusted'
                        : store.owner.trustLevel === 'REGISTERED'
                          ? 'Unverified'
                          : store.owner.trustLevel.replace(/_/g, ' ')}
                    </div>
                  </>
                ),
              },
              {
                key: 'listings',
                label: 'Listings',
                align: 'right',
                render: (store) => store._count.listings.toLocaleString(),
              },
              {
                key: 'status',
                label: 'Status',
                render: (store) => (
                  <AdminChip tone={STATUS_META[store.status].tone} dot>
                    {STATUS_META[store.status].label}
                  </AdminChip>
                ),
              },
              {
                key: 'updated',
                label: 'Updated',
                render: (store) => formatDate(store.updatedAt),
              },
              {
                key: 'actions',
                label: 'Actions',
                align: 'right',
                render: renderActions,
              },
            ]}
            renderExpanded={(store) => (
              <div
                id={`store-details-${store.id}`}
                role="region"
                aria-label={`Details for ${store.name}`}
                className="admin-record-details"
              >
                <dl className="admin-detail-fields">
                  <div>
                    <dt>Description</dt>
                    <dd>{store.description || 'No description provided'}</dd>
                  </div>
                  <div>
                    <dt>Website</dt>
                    <dd>{store.websiteUrl || 'None'}</dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>{store.contactEmail || 'None'}</dd>
                  </div>
                  <div>
                    <dt>Phone</dt>
                    <dd>{store.contactPhone || 'None'}</dd>
                  </div>
                  <div>
                    <dt>Submitted</dt>
                    <dd>{formatDate(store.createdAt)}</dd>
                  </div>
                  <div>
                    <dt>Approved</dt>
                    <dd>
                      {formatDate(store.approvedAt)}
                      {store.approvedBy
                        ? ` by ${store.approvedBy.firstName} ${store.approvedBy.lastName}`
                        : ''}
                    </dd>
                  </div>
                </dl>
                <div className="admin-detail-media">
                  {store.logoUrl ? (
                    <img src={store.logoUrl} alt={`${store.name} logo`} />
                  ) : (
                    <span>No logo</span>
                  )}
                  {store.bannerUrl ? (
                    <img src={store.bannerUrl} alt={`${store.name} banner`} />
                  ) : (
                    <span>No banner</span>
                  )}
                </div>
              </div>
            )}
          />
        </div>
      </AdminSection>

      {statusTarget ? (
        <ConfirmDialog
          title={statusTarget.label}
          description={
            statusTarget.nextStatus === 'APPROVED'
              ? 'This store will be approved for public storefront visibility and listing publication.'
              : statusTarget.nextStatus === 'REJECTED'
                ? 'This store will be marked rejected. The seller can edit and resubmit it later.'
                : 'This store will be suspended from public visibility until staff re-approves it.'
          }
          confirmLabel="Confirm"
          tone={statusTarget.nextStatus === 'APPROVED' ? 'neutral' : 'danger'}
          isSubmitting={actionLoading === statusTarget.id}
          onCancel={() => {
            if (!actionLoading) {
              setStatusTarget(null);
              setStatusReason('');
            }
          }}
          onConfirm={() =>
            updateStoreStatus(statusTarget.id, statusTarget.nextStatus)
          }
        >
          <label className="admin-dialog-field">
            <span className="form-label">
              Reason <span className="admin-list-secondary">(optional)</span>
            </span>
            <textarea
              value={statusReason}
              onChange={(event) => setStatusReason(event.target.value)}
              rows={3}
              className="form-input"
              placeholder="Internal note or feedback"
              disabled={Boolean(actionLoading)}
            />
          </label>
          {error ? (
            <p role="alert" className="admin-list-error">
              {error}
            </p>
          ) : null}
        </ConfirmDialog>
      ) : null}
    </AdminPage>
  );
}
