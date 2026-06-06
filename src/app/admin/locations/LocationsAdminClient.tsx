'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ListChecks, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AdminChip } from '@/components/admin/AdminChip';
import { AdminFilterBar } from '@/components/admin/AdminFilterBar';
import { AdminViewTabs } from '@/components/admin/AdminViewTabs';
import { CrudActionButton } from '@/components/shared/CrudAction';
import { formatLocationPrimary, formatLocationSearchLabel, formatLocationSecondary } from '@/lib/location-format';

type LocationRecord = {
  id: string;
  name: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string | null;
  countryCode: string;
  validationStatus: 'UNVERIFIED' | 'NORMALIZED' | 'VERIFIED' | 'NEEDS_REVIEW';
  updatedAt: Date | string;
  _count: {
    events: number;
  };
};

type ClientLocationRecord = Omit<LocationRecord, 'updatedAt'> & {
  updatedAt: Date;
};

type LocationFormState = {
  name: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
  validationStatus: LocationRecord['validationStatus'];
};

const LOCATION_PAGE_SIZE = 12;
const LOCATION_STATUS_OPTIONS: Array<{ value: LocationRecord['validationStatus']; label: string; tone: 'neu' | 'ok' | 'pend' | 'bad' }> = [
  { value: 'UNVERIFIED', label: 'Unverified', tone: 'neu' },
  { value: 'NORMALIZED', label: 'Normalized', tone: 'pend' },
  { value: 'VERIFIED', label: 'Verified', tone: 'ok' },
  { value: 'NEEDS_REVIEW', label: 'Needs Review', tone: 'bad' },
];

const EMPTY_FORM: LocationFormState = {
  name: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  countryCode: 'US',
  validationStatus: 'UNVERIFIED',
};

function getStatusMeta(status: LocationRecord['validationStatus']) {
  return LOCATION_STATUS_OPTIONS.find((option) => option.value === status) ?? LOCATION_STATUS_OPTIONS[0];
}

function formatUpdatedAt(value: Date | string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function buildFormFromLocation(location: LocationRecord): LocationFormState {
  return {
    name: location.name || '',
    addressLine1: location.addressLine1,
    addressLine2: location.addressLine2 || '',
    city: location.city,
    state: location.state,
    postalCode: location.postalCode || '',
    countryCode: location.countryCode,
    validationStatus: location.validationStatus,
  };
}

export default function LocationsAdminClient({ initialLocations }: { initialLocations: LocationRecord[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeView = searchParams.get('view') || 'list';
  const focus = searchParams.get('focus');

  const [rows, setRows] = useState(
    initialLocations.map((location) => ({
      ...location,
      updatedAt: new Date(location.updatedAt),
    })) satisfies ClientLocationRecord[]
  );
  const [filterValue, setFilterValue] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [form, setForm] = useState<LocationFormState>(EMPTY_FORM);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [duplicateLocations, setDuplicateLocations] = useState<LocationRecord[]>([]);

  const focusedLocation = useMemo(
    () => (focus && focus !== 'new' ? rows.find((location) => location.id === focus) ?? null : null),
    [focus, rows]
  );

  useEffect(() => {
    if (activeView !== 'form') {
      return;
    }

    if (focusedLocation) {
      setForm(buildFormFromLocation(focusedLocation));
      return;
    }

    setForm(EMPTY_FORM);
  }, [activeView, focusedLocation]);

  const normalizedFilter = filterValue.trim().toLowerCase();
  const filteredRows = rows.filter((location) =>
    !normalizedFilter || formatLocationSearchLabel(location).toLowerCase().includes(normalizedFilter)
  );
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / LOCATION_PAGE_SIZE));
  const safePage = Math.min(currentPage, pageCount);
  const pageStart = (safePage - 1) * LOCATION_PAGE_SIZE;
  const pageRows = filteredRows.slice(pageStart, pageStart + LOCATION_PAGE_SIZE);

  function updateSearchParams(updates: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (!value) {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    });

    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  function openCreateForm() {
    setError('');
    setSuccess('');
    setDuplicateLocations([]);
    setForm(EMPTY_FORM);
    updateSearchParams({ view: 'form', focus: 'new' });
  }

  function openEditForm(location: LocationRecord) {
    setError('');
    setSuccess('');
    setDuplicateLocations([]);
    setForm(buildFormFromLocation(location));
    updateSearchParams({ view: 'form', focus: location.id });
  }

  function resetToList() {
    setError('');
    setDuplicateLocations([]);
    updateSearchParams({ view: 'list', focus: null });
  }

  function handleFormChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function submitLocation(force = false) {
    setIsSaving(true);
    setError('');
    setSuccess('');

    const isEditing = Boolean(focusedLocation);
    const endpoint = isEditing ? `/api/admin/locations/${focusedLocation!.id}` : '/api/admin/locations';
    const method = isEditing ? 'PATCH' : 'POST';

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...form,
          countryCode: form.countryCode.trim().toUpperCase(),
          state: form.state.trim().toUpperCase(),
          forceCreate: !isEditing ? force : undefined,
          forceUpdate: isEditing ? force : undefined,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 409 && Array.isArray(data.duplicates)) {
        setDuplicateLocations(
          data.duplicates.map((location: LocationRecord) => ({
            ...location,
            updatedAt: new Date(location.updatedAt),
          }))
        );
        throw new Error(data.error || 'Possible duplicate location found');
      }

      if (!response.ok) {
        const validationMessage = Array.isArray(data.details)
          ? data.details
              .map((detail: { message?: string }) => detail.message)
              .filter(Boolean)
              .join(', ')
          : '';
        throw new Error(validationMessage || data.error || 'Failed to save location');
      }

      const nextLocation = {
        ...data.location,
        updatedAt: new Date(data.location.updatedAt),
      } as ClientLocationRecord;

      setDuplicateLocations([]);
      setRows((current) => {
        if (isEditing) {
          return current
            .map((location) => (location.id === nextLocation.id ? nextLocation : location))
            .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
        }

        return [nextLocation, ...current];
      });
      setSuccess(isEditing ? 'Location updated.' : 'Location created.');
      setForm(buildFormFromLocation(nextLocation));
      updateSearchParams({ view: 'form', focus: nextLocation.id });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save location');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitLocation(false);
  }

  async function handleDelete(location: LocationRecord) {
    const confirmed = window.confirm(`Delete ${formatLocationPrimary(location)}?`);
    if (!confirmed) {
      return;
    }

    setDeletingId(location.id);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/admin/locations/${location.id}`, {
        method: 'DELETE',
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete location');
      }

      setRows((current) => current.filter((entry) => entry.id !== location.id));
      setSuccess('Location deleted.');

      if (focus === location.id) {
        resetToList();
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete location');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <AdminViewTabs
        defaultView="list"
        views={[
          { key: 'list', label: 'List', count: rows.length },
          { key: 'form', label: focusedLocation ? 'Edit' : '+ Form' },
        ]}
      />

      {activeView === 'list' ? (
        <div className="admin-list">
          <AdminFilterBar
            search={
              <label className="admin-list-filter">
                <span className="admin-list-filter-label">Venue, Address, City</span>
                <input
                  type="text"
                  value={filterValue}
                  onChange={(event) => {
                    setFilterValue(event.target.value);
                    setCurrentPage(1);
                  }}
                  className="admin-list-filter-input"
                  placeholder="Filter locations"
                />
              </label>
            }
            right={
              <CrudActionButton
                type="button"
                variant="primary"
                icon={Plus}
                label="Add location"
                onClick={openCreateForm}
              >
                Add Location
              </CrudActionButton>
            }
          />

          {error ? <div className="admin-list-error">{error}</div> : null}
          {success ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}

          <div className="admin-list-table-wrap">
            <table className="admin-list-table">
              <thead className="admin-list-head">
                <tr>
                  <th className="admin-list-header-cell">Location</th>
                  <th className="admin-list-header-cell">Status</th>
                  <th className="admin-list-header-cell">Events</th>
                  <th className="admin-list-header-cell">Updated</th>
                  <th className="admin-list-header-cell">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length > 0 ? (
                  pageRows.map((location) => {
                    const statusMeta = getStatusMeta(location.validationStatus);

                    return (
                      <tr key={location.id} className="admin-list-row">
                        <td className="admin-list-cell">
                          <div className="font-semibold text-slate-950">{formatLocationPrimary(location)}</div>
                          <div className="mt-1 text-xs text-slate-500">{formatLocationSecondary(location)}</div>
                        </td>
                        <td className="admin-list-cell">
                          <AdminChip tone={statusMeta.tone}>{statusMeta.label}</AdminChip>
                        </td>
                        <td className="admin-list-cell">{location._count.events}</td>
                        <td className="admin-list-cell">{formatUpdatedAt(location.updatedAt)}</td>
                        <td className="admin-list-cell">
                          <div className="flex flex-wrap gap-2">
                            <CrudActionButton
                              type="button"
                              variant="inline"
                              icon={Pencil}
                              label="Edit location"
                              onClick={() => openEditForm(location)}
                            >
                              Edit
                            </CrudActionButton>
                            <CrudActionButton
                              type="button"
                              variant="inline-danger"
                              icon={Trash2}
                              label="Delete location"
                              disabled={deletingId === location.id}
                              onClick={() => handleDelete(location)}
                            >
                              {deletingId === location.id ? 'Deleting...' : 'Delete'}
                            </CrudActionButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr className="admin-list-row">
                    <td className="admin-list-empty" colSpan={5}>
                      {rows.length === 0 ? 'No locations yet. Add one to support event creation.' : 'No locations match that filter.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {filteredRows.length > LOCATION_PAGE_SIZE ? (
            <div className="admin-list-pagination">
              <div className="admin-list-pagination-label">
                Showing {pageStart + 1}-{Math.min(pageStart + LOCATION_PAGE_SIZE, filteredRows.length)} of {filteredRows.length}
              </div>
              <div className="admin-list-pagination-actions">
                <button
                  type="button"
                  className="admin-list-pagination-button"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </button>
                <span className="admin-list-pagination-page">
                  Page {safePage} of {pageCount}
                </span>
                <button
                  type="button"
                  className="admin-list-pagination-button"
                  disabled={safePage >= pageCount}
                  onClick={() => setCurrentPage((current) => Math.min(pageCount, current + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-950">
                {focusedLocation ? 'Edit location' : 'Add location'}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Locations are required for event validation and can be reused across event drafts.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {focusedLocation ? (
                <AdminChip tone={getStatusMeta(focusedLocation.validationStatus).tone}>
                  {getStatusMeta(focusedLocation.validationStatus).label}
                </AdminChip>
              ) : null}
              <CrudActionButton
                type="button"
                variant="neutral"
                icon={ListChecks}
                label="Back to list"
                onClick={resetToList}
              >
                List
              </CrudActionButton>
            </div>
          </div>

          {error ? <div className="admin-list-error">{error}</div> : null}
          {success ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="admin-list-filter">
              <span className="admin-list-filter-label">Venue Name</span>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleFormChange}
                className="form-input"
                placeholder="Optional venue label"
              />
            </label>
            <label className="admin-list-filter">
              <span className="admin-list-filter-label">Address Line 1</span>
              <input
                type="text"
                name="addressLine1"
                value={form.addressLine1}
                onChange={handleFormChange}
                className="form-input"
                required
              />
            </label>
            <label className="admin-list-filter">
              <span className="admin-list-filter-label">Address Line 2</span>
              <input
                type="text"
                name="addressLine2"
                value={form.addressLine2}
                onChange={handleFormChange}
                className="form-input"
              />
            </label>
            <label className="admin-list-filter">
              <span className="admin-list-filter-label">City</span>
              <input
                type="text"
                name="city"
                value={form.city}
                onChange={handleFormChange}
                className="form-input"
                required
              />
            </label>
            <label className="admin-list-filter">
              <span className="admin-list-filter-label">State</span>
              <input
                type="text"
                name="state"
                value={form.state}
                onChange={handleFormChange}
                className="form-input"
                required
                maxLength={80}
              />
            </label>
            <label className="admin-list-filter">
              <span className="admin-list-filter-label">Postal Code</span>
              <input
                type="text"
                name="postalCode"
                value={form.postalCode}
                onChange={handleFormChange}
                className="form-input"
              />
            </label>
            <label className="admin-list-filter">
              <span className="admin-list-filter-label">Country Code</span>
              <input
                type="text"
                name="countryCode"
                value={form.countryCode}
                onChange={handleFormChange}
                className="form-input"
                maxLength={2}
                required
              />
            </label>
            <label className="admin-list-filter">
              <span className="admin-list-filter-label">Validation Status</span>
              <select
                name="validationStatus"
                value={form.validationStatus}
                onChange={handleFormChange}
                className="admin-list-cell-select min-w-[14rem]"
              >
                {LOCATION_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {focusedLocation ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <div className="font-semibold text-slate-900">{formatLocationPrimary(focusedLocation)}</div>
              <div className="mt-1">{formatLocationSecondary(focusedLocation)}</div>
              <div className="mt-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                <MapPin className="h-3.5 w-3.5" />
                {focusedLocation._count.events} linked event{focusedLocation._count.events === 1 ? '' : 's'}
              </div>
            </div>
          ) : null}

          {duplicateLocations.length > 0 ? (
            <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900">Possible duplicates</p>
              {duplicateLocations.map((location) => (
                <div key={location.id} className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-slate-700">
                  {formatLocationSearchLabel(location)}
                </div>
              ))}
              <CrudActionButton
                type="button"
                variant="secondary"
                icon={Plus}
                label="Save anyway"
                onClick={() => submitLocation(true)}
              >
                Save Anyway
              </CrudActionButton>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <CrudActionButton
              type="submit"
              variant="primary"
              icon={focusedLocation ? Pencil : Plus}
              label={focusedLocation ? 'Save location' : 'Create location'}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : focusedLocation ? 'Save Location' : 'Create Location'}
            </CrudActionButton>
            {focusedLocation ? (
              <CrudActionButton
                type="button"
                variant="danger"
                icon={Trash2}
                label="Delete location"
                disabled={deletingId === focusedLocation.id}
                onClick={() => handleDelete(focusedLocation)}
              >
                {deletingId === focusedLocation.id ? 'Deleting...' : 'Delete Location'}
              </CrudActionButton>
            ) : null}
          </div>
        </form>
      )}
    </div>
  );
}
