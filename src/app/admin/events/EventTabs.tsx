'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Building2, Check, MapPin, Plus, Settings2, X } from 'lucide-react';
import { AdminChip } from '@/components/admin/AdminChip';
import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminFilterBar } from '@/components/admin/AdminFilterBar';
import { AdminViewTabs } from '@/components/admin/AdminViewTabs';
import { CrudActionButton } from '@/components/shared/CrudAction';
import ImageUpload from '@/components/shared/ImageUpload';
import { formatLocationPrimary, formatLocationSearchLabel, formatLocationSecondary } from '@/lib/location-format';
import {
  ORGANIZATION_GROUP_OPTIONS,
  ORGANIZATION_TYPE_OPTIONS,
  type OrganizationDirectoryGroup,
} from '@/lib/organization-taxonomy';

const EVENT_TABS = ['pending', 'approved', 'archived'] as const;
const EVENT_PAGE_SIZE = 10;
const EVENT_STATUS_OPTIONS = [
  { value: 'PUBLISHED', label: 'Approved' },
  { value: 'PENDING_REVIEW', label: 'Pending' },
  { value: 'UNPUBLISHED', label: 'Archived' },
] as const;

type EventTab = (typeof EVENT_TABS)[number];

interface LocationRecord {
  id: string;
  name: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string | null;
  validationStatus?: string;
}

interface EventRecord {
  id: string;
  title: string;
  status: 'PENDING_REVIEW' | 'PUBLISHED' | 'UNPUBLISHED';
  startDatetime: Date;
  endDatetime: Date | null;
  seriesPosition: number | null;
  seriesCount: number | null;
  updatedAt: Date;
  venueLabel: string | null;
  series: {
    id: string;
    summary: string | null;
  } | null;
  location: LocationRecord;
  submittedBy: {
    firstName: string;
    lastName: string;
  };
}

interface OrganizationOption {
  id: string;
  name: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
}

interface EventTabsProps {
  events: EventRecord[];
  organizations: OrganizationOption[];
  locations: LocationRecord[];
}

interface CreateEventFormState {
  title: string;
  description: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  locationId: string;
  venueLabel: string;
  costText: string;
  contactInfo: string;
  imageUrl: string;
  status: EventRecord['status'];
  organizationId: string;
  recurrenceEnabled: boolean;
  recurrenceCadence: 'WEEKLY' | 'MONTHLY_DATE' | 'MONTHLY_WEEKDAY';
  repeatCount: string;
}

interface CreateLocationFormState {
  name: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
}

interface CreateOrganizationFormState {
  name: string;
  directoryGroup: OrganizationDirectoryGroup;
  organizationType: string;
  websiteUrl: string;
}

function formatDateTime(value: Date | null) {
  if (!value) {
    return 'Not set';
  }

  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getStatusForTab(tab: EventTab): EventRecord['status'] {
  switch (tab) {
    case 'pending':
      return 'PENDING_REVIEW';
    case 'archived':
      return 'UNPUBLISHED';
    default:
      return 'PUBLISHED';
  }
}

function getTabLabel(tab: EventTab) {
  return tab.charAt(0).toUpperCase() + tab.slice(1);
}

function getOrganizationStatusLabel(status: OrganizationOption['status']) {
  switch (status) {
    case 'APPROVED':
      return 'Approved';
    case 'REJECTED':
      return 'Rejected';
    case 'SUSPENDED':
      return 'Suspended';
    default:
      return 'Pending';
  }
}

export default function EventTabs({ events, organizations, locations }: EventTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get('view') as EventTab) || 'pending';
  const focus = searchParams.get('focus');
  const [filterValue, setFilterValue] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rows, setRows] = useState(events);
  const [locationRows, setLocationRows] = useState(locations);
  const [organizationRows, setOrganizationRows] = useState(organizations);
  const [savingStatusEventId, setSavingStatusEventId] = useState<string | null>(null);
  const [statusError, setStatusError] = useState('');
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [locationFilter, setLocationFilter] = useState('');
  const [organizationFilter, setOrganizationFilter] = useState('');
  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(false);
  const [showCreateOrganization, setShowCreateOrganization] = useState(false);
  const [showCreateLocation, setShowCreateLocation] = useState(false);
  const [locationCreateError, setLocationCreateError] = useState('');
  const [organizationCreateError, setOrganizationCreateError] = useState('');
  const [locationDuplicates, setLocationDuplicates] = useState<LocationRecord[]>([]);
  const [isCreatingLocation, setIsCreatingLocation] = useState(false);
  const [isCreatingOrganization, setIsCreatingOrganization] = useState(false);
  const [createForm, setCreateForm] = useState<CreateEventFormState>({
    title: '',
    description: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    locationId: '',
    venueLabel: '',
    costText: '',
    contactInfo: '',
    imageUrl: '',
    status: 'PUBLISHED',
    organizationId: '',
    recurrenceEnabled: false,
    recurrenceCadence: 'WEEKLY',
    repeatCount: '3',
  });
  const [createLocationForm, setCreateLocationForm] = useState<CreateLocationFormState>({
    name: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
  });
  const [createOrganizationForm, setCreateOrganizationForm] = useState<CreateOrganizationFormState>({
    name: '',
    directoryGroup: 'ORGANIZATION',
    organizationType: ORGANIZATION_TYPE_OPTIONS.ORGANIZATION[0].value,
    websiteUrl: '',
  });

  const normalizedFilter = filterValue.trim().toLowerCase();
  const normalizedLocationFilter = locationFilter.trim().toLowerCase();
  const normalizedOrganizationFilter = organizationFilter.trim().toLowerCase();
  const currentStatus = getStatusForTab(activeTab);

  const filteredEvents = rows.filter((event) => {
    if (!currentStatus || event.status !== currentStatus) {
      return false;
    }

    if (!normalizedFilter) {
      return true;
    }

    const locationLabel = formatLocationSearchLabel(event.location).toLowerCase();

    return (
      event.title.toLowerCase().includes(normalizedFilter) ||
      event.submittedBy.lastName.toLowerCase().includes(normalizedFilter) ||
      locationLabel.includes(normalizedFilter) ||
      (event.venueLabel || '').toLowerCase().includes(normalizedFilter)
    );
  });

  const pageCount = Math.max(1, Math.ceil(filteredEvents.length / EVENT_PAGE_SIZE));
  const safePage = Math.min(currentPage, pageCount);
  const pageStart = (safePage - 1) * EVENT_PAGE_SIZE;
  const pageEvents = filteredEvents.slice(pageStart, pageStart + EVENT_PAGE_SIZE);
  const focusedEvent = focus && focus !== 'new' ? rows.find((event) => event.id === focus) ?? null : null;

  const filteredLocations = useMemo(
    () =>
      locationRows.filter((location) => {
        if (!normalizedLocationFilter) {
          return true;
        }

        return formatLocationSearchLabel(location).toLowerCase().includes(normalizedLocationFilter);
      }),
    [locationRows, normalizedLocationFilter]
  );

  const filteredOrganizations = useMemo(() => organizationRows, [organizationRows]);

  const selectedLocation = locationRows.find((location) => location.id === createForm.locationId) || null;
  const selectedOrganization = organizationRows.find((organization) => organization.id === createForm.organizationId) || null;

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

  useEffect(() => {
    async function fetchOrganizations() {
      if (!normalizedOrganizationFilter) {
        setOrganizationRows([]);
        setIsLoadingOrganizations(false);
        return;
      }

      setIsLoadingOrganizations(true);

      try {
        const response = await fetch(`/api/organizations?query=${encodeURIComponent(organizationFilter.trim())}`);
        if (!response.ok) {
          throw new Error('Failed to fetch organizations');
        }

        const data = await response.json();
        setOrganizationRows(data.organizations || []);
      } catch (error) {
        console.error('Failed to fetch organizations:', error);
        setOrganizationRows([]);
      } finally {
        setIsLoadingOrganizations(false);
      }
    }

    void fetchOrganizations();
  }, [normalizedOrganizationFilter, organizationFilter]);

  function handleFilterChange(value: string) {
    setFilterValue(value);
    setCurrentPage(1);
  }

  function handleCreateInputChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value, type } = event.target;

    setCreateForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? (event.target as HTMLInputElement).checked : value,
    }));
  }

  function handleCreateLocationInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;

    setCreateLocationForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleCreateOrganizationInputChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = event.target;

    if (name === 'directoryGroup') {
      const nextGroup = value as OrganizationDirectoryGroup;
      setCreateOrganizationForm((current) => ({
        ...current,
        directoryGroup: nextGroup,
        organizationType: ORGANIZATION_TYPE_OPTIONS[nextGroup][0].value,
      }));
      return;
    }

    setCreateOrganizationForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleCreateLocation(forceCreate = false) {
    setLocationCreateError('');
    setLocationDuplicates([]);

    if (!createLocationForm.addressLine1.trim() || !createLocationForm.city.trim() || !createLocationForm.state.trim()) {
      setLocationCreateError('Address line 1, city, and state are required.');
      return;
    }

    setIsCreatingLocation(true);

    try {
      const response = await fetch('/api/locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...createLocationForm,
          forceCreate,
        }),
      });

      const data = await response.json();

      if (response.status === 409) {
        setLocationDuplicates(data.duplicates || []);
        setLocationCreateError(data.error || 'Possible duplicate location found.');
        return;
      }

      if (!response.ok) {
        const validationMessage = Array.isArray(data.details)
          ? data.details
              .map((detail: { message?: string }) => detail.message)
              .filter(Boolean)
              .join(', ')
          : '';
        throw new Error(validationMessage || data.error || 'Failed to create location');
      }

      setLocationRows((current) => [data.location, ...current]);
      setCreateForm((current) => ({
        ...current,
        locationId: data.location.id,
      }));
      setCreateLocationForm({
        name: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        postalCode: '',
      });
      setLocationFilter('');
      setShowCreateLocation(false);
    } catch (error) {
      setLocationCreateError(error instanceof Error ? error.message : 'Failed to create location');
    } finally {
      setIsCreatingLocation(false);
    }
  }

  async function handleCreateOrganization() {
    setOrganizationCreateError('');

    if (!createOrganizationForm.name.trim()) {
      setOrganizationCreateError('Organization name is required.');
      return;
    }

    setIsCreatingOrganization(true);

    try {
      const response = await fetch('/api/admin/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...createOrganizationForm,
          status: 'PENDING_APPROVAL',
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

      setOrganizationRows((current) => [data.organization, ...current]);
      setCreateForm((current) => ({
        ...current,
        organizationId: data.organization.id,
      }));
      setCreateOrganizationForm({
        name: '',
        directoryGroup: 'ORGANIZATION',
        organizationType: ORGANIZATION_TYPE_OPTIONS.ORGANIZATION[0].value,
        websiteUrl: '',
      });
      setOrganizationFilter('');
      setShowCreateOrganization(false);
    } catch (error) {
      setOrganizationCreateError(error instanceof Error ? error.message : 'Failed to create organization');
    } finally {
      setIsCreatingOrganization(false);
    }
  }

  async function handleCreateEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError('');
    setCreateSuccess('');

    if (!createForm.title.trim()) {
      setCreateError('Event title is required.');
      return;
    }

    if (!createForm.startDate) {
      setCreateError('Start date is required.');
      return;
    }

    if (!createForm.organizationId) {
      setCreateError('Organization is required.');
      return;
    }

    if (!createForm.locationId) {
      setCreateError('Location is required.');
      return;
    }

    setIsCreating(true);

    try {
      const repeatCount = Number.parseInt(createForm.repeatCount, 10);

      if (createForm.recurrenceEnabled && (!Number.isFinite(repeatCount) || repeatCount < 2 || repeatCount > 24)) {
        throw new Error('Repeat count must be between 2 and 24 sessions.');
      }

      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...createForm,
          recurrence: createForm.recurrenceEnabled
            ? {
                enabled: true,
                cadence: createForm.recurrenceCadence,
                occurrenceCount: repeatCount,
              }
            : undefined,
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
        throw new Error(validationMessage || data.error || 'Failed to create event');
      }

      const createdRows = (Array.isArray(data.createdEvents) ? data.createdEvents : [data]).map(
        (entry: EventRecord & { startDatetime: string; endDatetime: string | null; updatedAt: string }) => ({
          ...entry,
          startDatetime: new Date(entry.startDatetime),
          endDatetime: entry.endDatetime ? new Date(entry.endDatetime) : null,
          updatedAt: new Date(entry.updatedAt),
        })
      );

      setRows((current) => [...createdRows, ...current]);
      setCreateForm({
        title: '',
        description: '',
        startDate: '',
        startTime: '',
        endDate: '',
        endTime: '',
        locationId: '',
        venueLabel: '',
        costText: '',
        contactInfo: '',
        imageUrl: '',
        status: 'PUBLISHED',
        organizationId: '',
        recurrenceEnabled: false,
        recurrenceCadence: 'WEEKLY',
        repeatCount: '3',
      });
      setCreateSuccess(data.createdCount > 1 ? `${data.createdCount} event sessions created.` : 'Event created successfully.');
      updateSearchParams({
        view: data.status === 'PUBLISHED' ? 'approved' : data.status === 'UNPUBLISHED' ? 'archived' : 'pending',
      });
      setCurrentPage(1);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Failed to create event');
    } finally {
      setIsCreating(false);
    }
  }

  async function handleStatusChange(eventId: string, nextStatus: EventRecord['status']) {
    setSavingStatusEventId(eventId);
    setStatusError('');

    try {
      const response = await fetch(`/api/events/${eventId}`, {
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
        current.map((event) =>
          event.id === eventId
            ? {
                ...event,
                status: data.status,
              }
            : event
        )
      );
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : 'Failed to update status');
    } finally {
      setSavingStatusEventId(null);
    }
  }

  const eventStatusMeta = (status: EventRecord['status']) => {
    const label = EVENT_STATUS_OPTIONS.find((option) => option.value === status)?.label || 'Status';
    return {
      label,
      tone: status === 'PUBLISHED' ? 'ok' : status === 'UNPUBLISHED' ? 'bad' : 'pend',
    } as const;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <AdminViewTabs
          defaultView="pending"
          views={EVENT_TABS.map((tab) => ({
            key: tab,
            label: getTabLabel(tab),
            count: rows.filter((event) => event.status === getStatusForTab(tab)).length,
            tone: tab === 'pending' ? 'pend' : tab === 'archived' ? 'bad' : undefined,
          }))}
        />
        <button
          type="button"
          className="page-header-action"
          onClick={() => updateSearchParams({ focus: 'new' })}
        >
          <Plus className="h-4 w-4" />
          <span>Event</span>
        </button>
      </div>

      <div className="admin-list">
        <AdminFilterBar
          search={
            <label className="admin-list-filter">
              <span className="admin-list-filter-label">Title, Submitter, Venue, Location</span>
              <input
                type="text"
                value={filterValue}
                onChange={(event) => handleFilterChange(event.target.value)}
                placeholder="Search by title, submitter, venue label, or location"
                className="admin-list-filter-input"
              />
            </label>
          }
          right={
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              {filteredEvents.length} {getTabLabel(activeTab).toLowerCase()} event{filteredEvents.length === 1 ? '' : 's'}
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
                <th className="admin-list-header-cell">Title</th>
                <th className="admin-list-header-cell">Submitted By</th>
                <th className="admin-list-header-cell">Starts</th>
                <th className="admin-list-header-cell">Location</th>
                <th className="admin-list-header-cell">Status</th>
                <th className="admin-list-header-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageEvents.length > 0 ? (
                pageEvents.map((event) => (
                  <tr key={event.id} className="admin-list-row">
                    <td className="admin-list-cell">
                      <Link href={`/admin/events/${event.id}`} className="admin-list-link">
                        {event.title}
                      </Link>
                      {event.seriesCount ? (
                        <div className="mt-1 text-xs text-slate-500">
                          Session {event.seriesPosition} of {event.seriesCount}
                          {event.series?.summary ? ` • ${event.series.summary}` : ''}
                        </div>
                      ) : null}
                    </td>
                    <td className="admin-list-cell">
                      {event.submittedBy.firstName} {event.submittedBy.lastName}
                    </td>
                    <td className="admin-list-cell">{formatDateTime(event.startDatetime)}</td>
                    <td className="admin-list-cell">
                      <div>{formatLocationPrimary(event.location, event.venueLabel)}</div>
                      <div className="text-xs text-slate-500">{formatLocationSecondary(event.location)}</div>
                    </td>
                    <td className="admin-list-cell">
                      <AdminChip tone={eventStatusMeta(event.status).tone}>
                        {eventStatusMeta(event.status).label}
                      </AdminChip>
                    </td>
                    <td className="admin-list-cell">
                      <div className="flex flex-wrap gap-3">
                        <Link href={`/admin/events/${event.id}`} className="admin-list-link">
                          Open
                        </Link>
                        <CrudActionButton
                          type="button"
                          variant="inline"
                          icon={Settings2}
                          label="Manage event"
                          onClick={() => updateSearchParams({ focus: event.id })}
                        >
                          Manage
                        </CrudActionButton>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="admin-list-empty" colSpan={6}>
                    No {activeTab} events match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="admin-list-pagination">
          <div className="admin-list-pagination-label">
            {filteredEvents.length} {getTabLabel(activeTab).toLowerCase()} event
            {filteredEvents.length === 1 ? '' : 's'}
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

      <AdminDrawer title={focus === 'new' ? 'Create Event' : focusedEvent ? `Manage ${focusedEvent.title}` : 'Manage Event'}>
        {focus === 'new' ? (
          <form onSubmit={handleCreateEvent} className="space-y-5">
            <div>
              <h3 className="text-lg font-bold text-slate-950">Add Event</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Create an event directly from admin using a reusable location record.
              </p>
            </div>

            {createError ? <div className="admin-list-error">{createError}</div> : null}
            {createSuccess ? (
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-700">
                {createSuccess}
              </div>
            ) : null}

            <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
              <div>
                <ImageUpload
                  context="event"
                  maxFiles={1}
                  singleCard
                  value={createForm.imageUrl ? [createForm.imageUrl] : []}
                  onUpload={(image) =>
                    setCreateForm((current) => ({
                      ...current,
                      imageUrl: image.url,
                    }))
                  }
                  onRemove={() =>
                    setCreateForm((current) => ({
                      ...current,
                      imageUrl: '',
                    }))
                  }
                  label="Event Photo"
                  labelClassName="form-label"
                  helperText="Optional hero-style image."
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <label className="form-label">Event Title</label>
                <input
                  type="text"
                  name="title"
                  value={createForm.title}
                  onChange={handleCreateInputChange}
                  className="form-input border-slate-300 bg-white text-slate-950"
                  placeholder="Downtown cleanup day"
                />
              </div>

              <div>
                <label className="form-label">Initial Status</label>
                <select
                  name="status"
                  value={createForm.status}
                  onChange={handleCreateInputChange}
                  className="form-input border-slate-300 bg-white text-slate-950"
                >
                  <option value="PUBLISHED">Approved</option>
                  <option value="PENDING_REVIEW">Pending</option>
                  <option value="UNPUBLISHED">Archived</option>
                </select>
              </div>

              <div>
                <label className="form-label">Start Date</label>
                <input
                  type="date"
                  name="startDate"
                  value={createForm.startDate}
                  onChange={handleCreateInputChange}
                  className="form-input border-slate-300 bg-white text-slate-950"
                />
              </div>

              <div>
                <label className="form-label">Start Time</label>
                <input
                  type="time"
                  name="startTime"
                  value={createForm.startTime}
                  onChange={handleCreateInputChange}
                  className="form-input border-slate-300 bg-white text-slate-950"
                />
              </div>

              <div>
                <label className="form-label">End Date</label>
                <input
                  type="date"
                  name="endDate"
                  value={createForm.endDate}
                  onChange={handleCreateInputChange}
                  className="form-input border-slate-300 bg-white text-slate-950"
                />
              </div>

              <div>
                <label className="form-label">End Time</label>
                <input
                  type="time"
                  name="endTime"
                  value={createForm.endTime}
                  onChange={handleCreateInputChange}
                  className="form-input border-slate-300 bg-white text-slate-950"
                />
              </div>

              <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Recurring series</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Generate separate event records for repeating sessions like classes.
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={createForm.recurrenceEnabled}
                      onChange={(event) =>
                        setCreateForm((current) => ({
                          ...current,
                          recurrenceEnabled: event.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    Repeat
                  </label>
                </div>

                {createForm.recurrenceEnabled ? (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="form-label">Pattern</label>
                      <select
                        name="recurrenceCadence"
                        value={createForm.recurrenceCadence}
                        onChange={handleCreateInputChange}
                        className="form-input border-slate-300 bg-white text-slate-950"
                      >
                        <option value="WEEKLY">Weekly</option>
                        <option value="MONTHLY_DATE">Monthly on this date</option>
                        <option value="MONTHLY_WEEKDAY">Monthly on this weekday pattern</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Total Sessions</label>
                      <input
                        type="number"
                        min={2}
                        max={24}
                        name="repeatCount"
                        value={createForm.repeatCount}
                        onChange={handleCreateInputChange}
                        className="form-input border-slate-300 bg-white text-slate-950"
                      />
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                      {createForm.recurrenceCadence === 'WEEKLY'
                        ? 'This will create one event every 7 days using the same title, location, and timing.'
                        : createForm.recurrenceCadence === 'MONTHLY_DATE'
                          ? 'This will create one event on the same calendar date each month.'
                          : 'This will create one event on the same weekday pattern each month, such as first Wednesday or last Thursday.'}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="lg:col-span-2">
                <label className="form-label">Location</label>
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex flex-col gap-3 lg:flex-row">
                    <input
                      type="text"
                      value={locationFilter}
                      onChange={(event) => setLocationFilter(event.target.value)}
                      className="form-input border-slate-300 bg-white text-slate-950"
                      placeholder="Filter locations by venue or address"
                    />
                    <CrudActionButton
                      type="button"
                      variant="neutral"
                      icon={showCreateLocation ? X : MapPin}
                      label={showCreateLocation ? 'Close location form' : 'Add Location'}
                      onClick={() => setShowCreateLocation((current) => !current)}
                    >
                      {showCreateLocation ? 'Close' : 'Location'}
                    </CrudActionButton>
                  </div>

                  <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2">
                    {filteredLocations.length > 0 ? (
                      filteredLocations.map((location) => (
                        <button
                          key={location.id}
                          type="button"
                          onClick={() =>
                            setCreateForm((current) => ({
                              ...current,
                              locationId: location.id,
                            }))
                          }
                          className={`flex w-full items-start justify-between rounded-lg px-3 py-2 text-left text-sm ${
                            createForm.locationId === location.id
                              ? 'bg-slate-950 text-white'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span>
                            <span className="block font-semibold">{formatLocationPrimary(location)}</span>
                            <span className="block text-xs opacity-75">{formatLocationSecondary(location)}</span>
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="rounded-lg px-3 py-2 text-sm text-slate-500">No locations match that filter.</div>
                    )}
                  </div>

                  {selectedLocation ? (
                    <p className="text-sm text-slate-600">
                      Selected: <span className="font-semibold text-slate-900">{formatLocationSearchLabel(selectedLocation)}</span>
                    </p>
                  ) : null}

                  {showCreateLocation ? (
                    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
                      {locationCreateError ? <div className="admin-list-error">{locationCreateError}</div> : null}
                      <div className="grid gap-3 lg:grid-cols-2">
                        <input
                          type="text"
                          name="name"
                          value={createLocationForm.name}
                          onChange={handleCreateLocationInputChange}
                          className="form-input border-slate-300 bg-white text-slate-950"
                          placeholder="Venue name (optional)"
                        />
                        <input
                          type="text"
                          name="addressLine1"
                          value={createLocationForm.addressLine1}
                          onChange={handleCreateLocationInputChange}
                          className="form-input border-slate-300 bg-white text-slate-950"
                          placeholder="Address line 1"
                        />
                        <input
                          type="text"
                          name="addressLine2"
                          value={createLocationForm.addressLine2}
                          onChange={handleCreateLocationInputChange}
                          className="form-input border-slate-300 bg-white text-slate-950"
                          placeholder="Address line 2"
                        />
                        <input
                          type="text"
                          name="city"
                          value={createLocationForm.city}
                          onChange={handleCreateLocationInputChange}
                          className="form-input border-slate-300 bg-white text-slate-950"
                          placeholder="City"
                        />
                        <input
                          type="text"
                          name="state"
                          value={createLocationForm.state}
                          onChange={handleCreateLocationInputChange}
                          className="form-input border-slate-300 bg-white text-slate-950"
                          placeholder="State"
                        />
                        <input
                          type="text"
                          name="postalCode"
                          value={createLocationForm.postalCode}
                          onChange={handleCreateLocationInputChange}
                          className="form-input border-slate-300 bg-white text-slate-950"
                          placeholder="Postal code"
                        />
                      </div>
                      {locationDuplicates.length > 0 ? (
                        <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                          <p className="text-sm font-semibold text-amber-900">Possible duplicates</p>
                          {locationDuplicates.map((location) => (
                            <button
                              key={location.id}
                              type="button"
                              onClick={() =>
                                setCreateForm((current) => ({
                                  ...current,
                                  locationId: location.id,
                                }))
                              }
                              className="block w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-left text-sm text-slate-700"
                            >
                              {formatLocationSearchLabel(location)}
                            </button>
                          ))}
                          <CrudActionButton
                            type="button"
                            variant="secondary"
                            icon={Check}
                            label="Create location anyway"
                            onClick={() => handleCreateLocation(true)}
                          >
                            Create Anyway
                          </CrudActionButton>
                        </div>
                      ) : null}
                      <CrudActionButton
                        type="button"
                        variant="primary"
                        icon={MapPin}
                        label={isCreatingLocation ? 'Creating location' : 'Create Location'}
                        onClick={() => handleCreateLocation()}
                        disabled={isCreatingLocation}
                      >
                        {isCreatingLocation ? 'Creating...' : 'Create Location'}
                      </CrudActionButton>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="lg:col-span-2">
                <label className="form-label">Venue Label</label>
                <input
                  type="text"
                  name="venueLabel"
                  value={createForm.venueLabel}
                  onChange={handleCreateInputChange}
                  className="form-input border-slate-300 bg-white text-slate-950"
                  placeholder="Main Hall, Rear Entrance, Pavilion 2"
                />
              </div>

              <div className="lg:col-span-2">
                <label className="form-label">Organization</label>
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex flex-col gap-3 lg:flex-row">
                    <input
                      type="text"
                      value={organizationFilter}
                      onChange={(event) => setOrganizationFilter(event.target.value)}
                      className="form-input border-slate-300 bg-white text-slate-950"
                      placeholder="Filter organizations by name"
                    />
                    <CrudActionButton
                      type="button"
                      variant="neutral"
                      icon={showCreateOrganization ? X : Building2}
                      label={showCreateOrganization ? 'Close organization form' : 'Add Organization'}
                      onClick={() => setShowCreateOrganization((current) => !current)}
                    >
                      {showCreateOrganization ? 'Close' : 'Organization'}
                    </CrudActionButton>
                  </div>
                  <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2">
                    {isLoadingOrganizations ? (
                      <div className="rounded-lg px-3 py-2 text-sm text-slate-500">Loading organizations...</div>
                    ) : !normalizedOrganizationFilter ? (
                      <div className="rounded-lg px-3 py-2 text-sm text-slate-500">Start typing to search organizations.</div>
                    ) : filteredOrganizations.length > 0 ? (
                      filteredOrganizations.map((organization) => (
                        <button
                          key={organization.id}
                          type="button"
                          onClick={() =>
                            setCreateForm((current) => ({
                              ...current,
                              organizationId: organization.id,
                            }))
                          }
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
                            createForm.organizationId === organization.id
                              ? 'bg-slate-950 text-white'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span>{organization.name}</span>
                          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">
                            {getOrganizationStatusLabel(organization.status)}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="rounded-lg px-3 py-2 text-sm text-slate-500">
                        No organizations match that filter.
                      </div>
                    )}
                  </div>
                  {selectedOrganization ? (
                    <p className="text-sm text-slate-600">
                      Selected: <span className="font-semibold text-slate-900">{selectedOrganization.name}</span>
                    </p>
                  ) : null}
                  {showCreateOrganization ? (
                    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
                      {organizationCreateError ? <div className="admin-list-error">{organizationCreateError}</div> : null}
                      <div className="grid gap-3 lg:grid-cols-2">
                        <input
                          type="text"
                          name="name"
                          value={createOrganizationForm.name}
                          onChange={handleCreateOrganizationInputChange}
                          className="form-input border-slate-300 bg-white text-slate-950"
                          placeholder="Organization name"
                        />
                        <select
                          name="directoryGroup"
                          value={createOrganizationForm.directoryGroup}
                          onChange={handleCreateOrganizationInputChange}
                          className="form-input border-slate-300 bg-white text-slate-950"
                        >
                          {ORGANIZATION_GROUP_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                        <select
                          name="organizationType"
                          value={createOrganizationForm.organizationType}
                          onChange={handleCreateOrganizationInputChange}
                          className="form-input border-slate-300 bg-white text-slate-950"
                        >
                          {ORGANIZATION_TYPE_OPTIONS[createOrganizationForm.directoryGroup].map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                        <input
                          type="url"
                          name="websiteUrl"
                          value={createOrganizationForm.websiteUrl}
                          onChange={handleCreateOrganizationInputChange}
                          className="form-input border-slate-300 bg-white text-slate-950"
                          placeholder="Website URL (optional)"
                        />
                      </div>
                      <p className="text-xs text-slate-500">
                        Inline-created organizations start as pending approval and can still be attached to this event immediately.
                      </p>
                      <CrudActionButton
                        type="button"
                        variant="primary"
                        icon={Building2}
                        label={isCreatingOrganization ? 'Creating organization' : 'Create Organization'}
                        onClick={() => handleCreateOrganization()}
                        disabled={isCreatingOrganization}
                      >
                        {isCreatingOrganization ? 'Creating...' : 'Create Organization'}
                      </CrudActionButton>
                    </div>
                  ) : null}
                </div>
              </div>

              <div>
                <label className="form-label">Cost</label>
                <input
                  type="text"
                  name="costText"
                  value={createForm.costText}
                  onChange={handleCreateInputChange}
                  className="form-input border-slate-300 bg-white text-slate-950"
                  placeholder="Free, $10, donation suggested"
                />
              </div>

              <div>
                <label className="form-label">Contact Info</label>
                <input
                  type="text"
                  name="contactInfo"
                  value={createForm.contactInfo}
                  onChange={handleCreateInputChange}
                  className="form-input border-slate-300 bg-white text-slate-950"
                  placeholder="Organizer email or phone"
                />
              </div>

	              <div className="lg:col-span-2">
	                <label className="form-label">Description</label>
	                <textarea
                  name="description"
                  value={createForm.description}
                  onChange={handleCreateInputChange}
                  rows={5}
                  className="form-textarea border-slate-300 bg-white text-slate-950"
	                  placeholder="Describe the event, schedule, audience, and any details attendees need."
	                />
	              </div>

	              <div className="lg:col-span-2">
	                <div className="form-card-actions justify-start">
                    <CrudActionButton
                      type="submit"
                      variant="primary"
                      icon={Plus}
                      label={isCreating ? 'Creating event' : 'Create Event'}
                      disabled={isCreating}
                    >
                      {isCreating ? 'Creating...' : 'Create Event'}
                    </CrudActionButton>
	                </div>
	              </div>
	              </div>
	            </div>
	          </form>
        ) : (
          focusedEvent ? (
            <div className="space-y-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <AdminChip tone={eventStatusMeta(focusedEvent.status).tone}>
                    {eventStatusMeta(focusedEvent.status).label}
                  </AdminChip>
                  {focusedEvent.seriesCount ? (
                    <AdminChip tone="role">
                      Session {focusedEvent.seriesPosition} of {focusedEvent.seriesCount}
                    </AdminChip>
                  ) : null}
                </div>
                <div className="mt-3 space-y-1 text-sm text-slate-600">
                  <p>
                    {focusedEvent.submittedBy.firstName} {focusedEvent.submittedBy.lastName}
                  </p>
                  <p>{formatDateTime(focusedEvent.startDatetime)}</p>
                  <p>{formatLocationSearchLabel(focusedEvent.location)}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Status</p>
                <select
                  className="admin-list-cell-select min-w-[14rem]"
                  value={focusedEvent.status}
                  disabled={savingStatusEventId === focusedEvent.id}
                  onChange={(entry) =>
                    handleStatusChange(focusedEvent.id, entry.target.value as EventRecord['status'])
                  }
                >
                  {EVENT_STATUS_OPTIONS.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              <Link href={`/admin/events/${focusedEvent.id}`} className="admin-list-link">
                Open full event editor
              </Link>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
              The selected event is not available in the current result set.
            </div>
          )
        )}
      </AdminDrawer>
    </div>
  );
}
