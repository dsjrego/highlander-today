'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import ImageUpload from '@/components/shared/ImageUpload';
import { formatLocationPrimary, formatLocationSearchLabel, formatLocationSecondary } from '@/lib/location-format';

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
  updatedAt: Date;
  venueLabel: string | null;
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
}

interface CreateLocationFormState {
  name: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
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
  const [activeTab, setActiveTab] = useState<EventTab | 'create'>('pending');
  const [filterValue, setFilterValue] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rows, setRows] = useState(events);
  const [locationRows, setLocationRows] = useState(locations);
  const [editingStatusEventId, setEditingStatusEventId] = useState<string | null>(null);
  const [savingStatusEventId, setSavingStatusEventId] = useState<string | null>(null);
  const [statusError, setStatusError] = useState('');
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [locationFilter, setLocationFilter] = useState('');
  const [organizationFilter, setOrganizationFilter] = useState('');
  const [showCreateLocation, setShowCreateLocation] = useState(false);
  const [locationCreateError, setLocationCreateError] = useState('');
  const [locationDuplicates, setLocationDuplicates] = useState<LocationRecord[]>([]);
  const [isCreatingLocation, setIsCreatingLocation] = useState(false);
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
  });
  const [createLocationForm, setCreateLocationForm] = useState<CreateLocationFormState>({
    name: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
  });

  const normalizedFilter = filterValue.trim().toLowerCase();
  const normalizedLocationFilter = locationFilter.trim().toLowerCase();
  const normalizedOrganizationFilter = organizationFilter.trim().toLowerCase();
  const currentStatus = activeTab === 'create' ? null : getStatusForTab(activeTab);

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

  const filteredOrganizations = useMemo(
    () =>
      normalizedOrganizationFilter
        ? organizations.filter((organization) =>
            organization.name.toLowerCase().includes(normalizedOrganizationFilter)
          )
        : [],
    [organizations, normalizedOrganizationFilter]
  );

  const selectedLocation = locationRows.find((location) => location.id === createForm.locationId) || null;
  const selectedOrganization = organizations.find((organization) => organization.id === createForm.organizationId) || null;

  function handleFilterChange(value: string) {
    setFilterValue(value);
    setCurrentPage(1);
  }

  function handleCreateInputChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = event.target;

    setCreateForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleCreateLocationInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;

    setCreateLocationForm((current) => ({
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

    if (!createForm.locationId) {
      setCreateError('Location is required.');
      return;
    }

    setIsCreating(true);

    try {
      const response = await fetch('/api/events', {
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
        throw new Error(validationMessage || data.error || 'Failed to create event');
      }

      setRows((current) => [
        {
          ...data,
          startDatetime: new Date(data.startDatetime),
          endDatetime: data.endDatetime ? new Date(data.endDatetime) : null,
          updatedAt: new Date(data.updatedAt),
        },
        ...current,
      ]);
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
      });
      setCreateSuccess('Event created successfully.');
      setActiveTab(data.status === 'PUBLISHED' ? 'approved' : data.status === 'UNPUBLISHED' ? 'archived' : 'pending');
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
      setEditingStatusEventId(null);
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : 'Failed to update status');
    } finally {
      setSavingStatusEventId(null);
    }
  }

  return (
    <div className="space-y-0">
      <div className="relative top-[2px] flex flex-wrap gap-0 pb-0">
        {EVENT_TABS.map((tab) => {
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
          Event
        </button>
      </div>

      <div className="admin-card-tab-body">
        {activeTab === 'create' ? (
          <form onSubmit={handleCreateEvent} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
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
                    <button
                      type="button"
                      onClick={() => setShowCreateLocation((current) => !current)}
                      className="btn btn-neutral"
                    >
                      {showCreateLocation ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      Location
                    </button>
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
                          <button type="button" onClick={() => handleCreateLocation(true)} className="btn btn-secondary">
                            Create Anyway
                          </button>
                        </div>
                      ) : null}
                      <button type="button" onClick={() => handleCreateLocation()} disabled={isCreatingLocation} className="btn btn-primary">
                        {isCreatingLocation ? 'Creating...' : 'Create Location'}
                      </button>
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
                  <input
                    type="text"
                    value={organizationFilter}
                    onChange={(event) => setOrganizationFilter(event.target.value)}
                    className="form-input border-slate-300 bg-white text-slate-950"
                    placeholder="Filter organizations by name"
                  />
                  <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2">
                    <button
                      type="button"
                      onClick={() =>
                        setCreateForm((current) => ({
                          ...current,
                          organizationId: '',
                        }))
                      }
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
                        !createForm.organizationId ? 'bg-slate-950 text-white' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                      >
                        <span>No linked organization</span>
                      </button>
                    {normalizedOrganizationFilter ? (
                      filteredOrganizations.length > 0 ? (
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
                      )
                    ) : (
                      <div className="rounded-lg px-3 py-2 text-sm text-slate-500">
                        Start typing to search organizations.
                      </div>
                    )}
                  </div>
                  {selectedOrganization ? (
                    <p className="text-sm text-slate-600">
                      Selected: <span className="font-semibold text-slate-900">{selectedOrganization.name}</span>
                    </p>
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
	                  <button type="submit" disabled={isCreating} className="btn btn-primary">
	                    {isCreating ? 'Creating...' : 'Create Event'}
	                  </button>
	                </div>
	              </div>
	            </div>
            </div>
	          </form>
        ) : (
          <div className="admin-list">
            <div className="admin-list-toolbar">
              <label className="admin-list-filter">
                <span className="admin-list-filter-label">Filter: Title, Submitter, Venue, Location</span>
                <input
                  type="text"
                  value={filterValue}
                  onChange={(event) => handleFilterChange(event.target.value)}
                  placeholder="Search by title, submitter, venue label, or location"
                  className="admin-list-filter-input"
                />
              </label>
            </div>

            {statusError ? <div className="admin-list-error">{statusError}</div> : null}

            <div className="admin-list-table-wrap">
              <table className="admin-list-table">
                <thead className="admin-list-head">
                  <tr>
                    <th className="admin-list-header-cell">Title</th>
                    <th className="admin-list-header-cell">Submitted By</th>
                    <th className="admin-list-header-cell">Starts</th>
                    <th className="admin-list-header-cell">Location</th>
                    <th className="admin-list-header-cell">Status</th>
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
                          {editingStatusEventId === event.id ? (
                            <select
                              className="admin-list-cell-select"
                              defaultValue={event.status}
                              disabled={savingStatusEventId === event.id}
                              onBlur={() => {
                                if (savingStatusEventId !== event.id) {
                                  setEditingStatusEventId(null);
                                }
                              }}
                              onChange={(entry) =>
                                handleStatusChange(event.id, entry.target.value as EventRecord['status'])
                              }
                              autoFocus
                            >
                              {EVENT_STATUS_OPTIONS.map((status) => (
                                <option key={status.value} value={status.value}>
                                  {status.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <button
                              type="button"
                              className="admin-list-cell-button"
                              onClick={() => setEditingStatusEventId(event.id)}
                            >
                              {EVENT_STATUS_OPTIONS.find((status) => status.value === event.status)?.label}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="admin-list-empty" colSpan={5}>
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
        )}
      </div>
    </div>
  );
}
