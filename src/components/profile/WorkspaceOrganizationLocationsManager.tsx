'use client';

import { Fragment, useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown, ChevronUp, Plus, Save, Star, Trash2 } from 'lucide-react';
import { AdminChip } from '@/components/admin/AdminChip';
import { CrudActionButton } from '@/components/shared/CrudAction';
import StatusMessage from '@/components/shared/StatusMessage';
import { formatPhoneInput } from '@/lib/organization-admin';

interface LocationRecord {
  id: string;
  label: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  municipality: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  websiteUrl: string | null;
  hoursSummary: string | null;
  isPrimary: boolean;
  isPublic: boolean;
  sortOrder: number;
}

interface LocationFormState {
  label: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  municipality: string;
  contactEmail: string;
  contactPhone: string;
  websiteUrl: string;
  hoursSummary: string;
  isPrimary: boolean;
  isPublic: boolean;
  sortOrder: string;
}

function buildLocationFormState(location?: LocationRecord): LocationFormState {
  return {
    label: location?.label || '',
    addressLine1: location?.addressLine1 || '',
    addressLine2: location?.addressLine2 || '',
    city: location?.city || '',
    state: location?.state || '',
    postalCode: location?.postalCode || '',
    municipality: location?.municipality || '',
    contactEmail: location?.contactEmail || '',
    contactPhone: location?.contactPhone || '',
    websiteUrl: location?.websiteUrl || '',
    hoursSummary: location?.hoursSummary || '',
    isPrimary: location?.isPrimary ?? false,
    isPublic: location?.isPublic ?? true,
    sortOrder: String(location?.sortOrder ?? 0),
  };
}

function formatNumericInput(value: string) {
  return String(value).trim();
}

function formatAddress(location: Pick<LocationRecord, 'addressLine1' | 'addressLine2' | 'city' | 'state' | 'postalCode'>) {
  const lineOne = [location.addressLine1, location.addressLine2].filter(Boolean).join(', ');
  const lineTwo = [location.city, location.state, location.postalCode].filter(Boolean).join(', ');
  return [lineOne, lineTwo].filter(Boolean);
}

function formatContact(location: Pick<LocationRecord, 'contactEmail' | 'contactPhone' | 'websiteUrl'>) {
  return [location.contactEmail, location.contactPhone, location.websiteUrl].filter(Boolean);
}

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="space-y-1.5">
      <span className="form-label text-slate-500">
        {label}
        {required ? ' *' : ' (optional)'}
      </span>
      {children}
    </label>
  );
}

function ToggleField({
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

function LocationFields({
  value,
  onChange,
}: {
  value: LocationFormState;
  onChange: (value: LocationFormState) => void;
}) {
  return (
    <div className="space-y-5">
      <fieldset className="space-y-4 rounded-lg border border-[var(--hl-admin-border)] p-4">
        <legend className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Identity</legend>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Location label">
            <input value={value.label} onChange={(event) => onChange({ ...value, label: event.target.value })} className="form-input" placeholder="Main Office, North Entrance, Community Hall..." />
          </Field>
          <Field label="Municipality">
            <input value={value.municipality} onChange={(event) => onChange({ ...value, municipality: event.target.value })} className="form-input" placeholder="Township, borough, or district" />
          </Field>
          <Field label="Sort order" required>
            <input value={value.sortOrder} onChange={(event) => onChange({ ...value, sortOrder: formatNumericInput(event.target.value) })} className="form-input" inputMode="numeric" placeholder="0" />
          </Field>
          <Field label="Hours summary">
            <input value={value.hoursSummary} onChange={(event) => onChange({ ...value, hoursSummary: event.target.value })} className="form-input" placeholder="Mon-Fri 9am-5pm" />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-lg border border-[var(--hl-admin-border)] p-4">
        <legend className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Address</legend>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Address line 1" required>
            <input value={value.addressLine1} onChange={(event) => onChange({ ...value, addressLine1: event.target.value })} className="form-input" placeholder="123 Main Street" />
          </Field>
          <Field label="Address line 2">
            <input value={value.addressLine2} onChange={(event) => onChange({ ...value, addressLine2: event.target.value })} className="form-input" placeholder="Suite, floor, room, unit..." />
          </Field>
          <Field label="City" required>
            <input value={value.city} onChange={(event) => onChange({ ...value, city: event.target.value })} className="form-input" placeholder="City" />
          </Field>
          <Field label="State" required>
            <input value={value.state} onChange={(event) => onChange({ ...value, state: event.target.value })} className="form-input" placeholder="NY" />
          </Field>
          <Field label="Postal code" required>
            <input value={value.postalCode} onChange={(event) => onChange({ ...value, postalCode: event.target.value })} className="form-input" placeholder="10001" />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-lg border border-[var(--hl-admin-border)] p-4">
        <legend className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Contact & Visibility</legend>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Contact email">
            <input value={value.contactEmail} onChange={(event) => onChange({ ...value, contactEmail: event.target.value })} className="form-input" placeholder="frontdesk@example.org" />
          </Field>
          <Field label="Contact phone">
            <input value={value.contactPhone} onChange={(event) => onChange({ ...value, contactPhone: formatPhoneInput(event.target.value) })} className="form-input" placeholder="(555) 555-5555" />
          </Field>
          <Field label="Website URL">
            <input value={value.websiteUrl} onChange={(event) => onChange({ ...value, websiteUrl: event.target.value })} className="form-input" placeholder="https://example.org/location" />
          </Field>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <ToggleField
            label="Primary location"
            hint="Use this location as the main public-facing record for the organization."
            checked={value.isPrimary}
            onChange={(checked) => onChange({ ...value, isPrimary: checked })}
          />
          <ToggleField
            label="Publicly visible"
            hint="Allow this location to appear on the public organization page."
            checked={value.isPublic}
            onChange={(checked) => onChange({ ...value, isPublic: checked })}
          />
        </div>
      </fieldset>
    </div>
  );
}

function LocationEditor({
  title,
  description,
  form,
  setForm,
  isSaving,
  onSubmit,
  onCancel,
  onDelete,
}: {
  title: string;
  description: string;
  form: LocationFormState;
  setForm: (value: LocationFormState) => void;
  isSaving: boolean;
  onSubmit: () => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
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
        <h4 className="text-base font-semibold text-slate-950">{title}</h4>
        <p className="text-sm text-slate-600">{description}</p>
      </div>

      <LocationFields value={form} onChange={setForm} />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--hl-admin-border)] pt-4">
        <div>
          {onDelete ? (
            <CrudActionButton
              type="button"
              variant="danger"
              icon={Trash2}
              label="Delete location"
              disabled={isSaving}
              onClick={() => void onDelete()}
            >
              Delete
            </CrudActionButton>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <CrudActionButton type="button" variant="secondary" icon={ChevronUp} label="Cancel location editing" disabled={isSaving} onClick={onCancel}>
            Cancel
          </CrudActionButton>
          <CrudActionButton type="submit" variant="primary" icon={Save} label="Save location" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Location'}
          </CrudActionButton>
        </div>
      </div>
    </form>
  );
}

export default function WorkspaceOrganizationLocationsManager({
  profileUserId,
  organizationId,
  initialLocations,
}: {
  profileUserId: string;
  organizationId: string;
  initialLocations: LocationRecord[];
}) {
  const [locations, setLocations] = useState(initialLocations);
  const [newLocationForm, setNewLocationForm] = useState<LocationFormState>(() => buildLocationFormState());
  const [expandedLocationId, setExpandedLocationId] = useState<string | 'new' | null>(null);
  const [editingForms, setEditingForms] = useState<Record<string, LocationFormState>>(() =>
    Object.fromEntries(initialLocations.map((location) => [location.id, buildLocationFormState(location)]))
  );
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [savingKey, setSavingKey] = useState<string | null>(null);

  function resetLocationForm(location: LocationRecord) {
    setEditingForms((current) => ({
      ...current,
      [location.id]: buildLocationFormState(location),
    }));
  }

  async function createLocation() {
    setSavingKey('new-location');
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/profile/${profileUserId}/workspace/organizations/${organizationId}/locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLocationForm),
      });
      const data = await response.json();

      if (!response.ok) {
        const validationMessage = Array.isArray(data.details)
          ? data.details.map((detail: { message?: string }) => detail.message).filter(Boolean).join(', ')
          : '';
        throw new Error(validationMessage || data.error || 'Failed to create location');
      }

      const nextLocations = [...locations.map((location) => (data.location.isPrimary ? { ...location, isPrimary: false } : location)), data.location].sort((a, b) =>
        a.isPrimary === b.isPrimary ? a.sortOrder - b.sortOrder : a.isPrimary ? -1 : 1
      );
      setLocations(nextLocations);
      setEditingForms((current) => ({
        ...current,
        [data.location.id]: buildLocationFormState(data.location),
      }));
      setNewLocationForm(buildLocationFormState());
      setExpandedLocationId(null);
      setSuccess('Location added.');
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create location');
    } finally {
      setSavingKey(null);
    }
  }

  async function saveLocation(locationId: string) {
    const form = editingForms[locationId];
    setSavingKey(`location-${locationId}`);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/profile/${profileUserId}/workspace/organizations/${organizationId}/locations/${locationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();

      if (!response.ok) {
        const validationMessage = Array.isArray(data.details)
          ? data.details.map((detail: { message?: string }) => detail.message).filter(Boolean).join(', ')
          : '';
        throw new Error(validationMessage || data.error || 'Failed to update location');
      }

      const nextLocations = locations
        .map((location) => (data.location.isPrimary && location.id !== locationId ? { ...location, isPrimary: false } : location))
        .map((location) => (location.id === locationId ? data.location : location))
        .sort((a, b) => (a.isPrimary === b.isPrimary ? a.sortOrder - b.sortOrder : a.isPrimary ? -1 : 1));
      setLocations(nextLocations);
      resetLocationForm(data.location);
      setExpandedLocationId(null);
      setSuccess('Location updated.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to update location');
    } finally {
      setSavingKey(null);
    }
  }

  async function deleteLocation(locationId: string) {
    setSavingKey(`delete-location-${locationId}`);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/profile/${profileUserId}/workspace/organizations/${organizationId}/locations/${locationId}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete location');
      }

      setLocations((current) => current.filter((location) => location.id !== locationId));
      setEditingForms((current) => {
        const next = { ...current };
        delete next[locationId];
        return next;
      });
      setExpandedLocationId(null);
      setSuccess('Location deleted.');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete location');
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <section className="rounded-xl border border-[var(--hl-admin-border)] bg-white shadow-sm">
      <div className="border-b border-[var(--hl-admin-border)] px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Locations</p>
            <h3 className="text-lg font-semibold text-slate-950">Manage organization locations</h3>
            <p className="text-sm text-slate-600">
              Add physical or public-facing locations, choose a primary location, and control which entries are visible publicly.
            </p>
          </div>
          <CrudActionButton
            type="button"
            variant="primary"
            icon={expandedLocationId === 'new' ? ChevronUp : Plus}
            label={expandedLocationId === 'new' ? 'Close new location editor' : 'Add location'}
            onClick={() => {
              setError('');
              setSuccess('');
              setExpandedLocationId((current) => (current === 'new' ? null : 'new'));
            }}
          >
            {expandedLocationId === 'new' ? 'Close' : 'Add Location'}
          </CrudActionButton>
        </div>
      </div>

      <div className="space-y-5 px-5 py-5">
        {error ? (
          <StatusMessage variant="error" title="Location update failed">
            <p>{error}</p>
          </StatusMessage>
        ) : null}

        {success ? (
          <StatusMessage variant="success" title="Locations updated">
            <p>{success}</p>
          </StatusMessage>
        ) : null}

        {expandedLocationId === 'new' ? (
          <LocationEditor
            title="Add location"
            description="Create a new location tied to this organization."
            form={newLocationForm}
            setForm={setNewLocationForm}
            isSaving={savingKey === 'new-location'}
            onSubmit={createLocation}
            onCancel={() => {
              setNewLocationForm(buildLocationFormState());
              setExpandedLocationId(null);
            }}
          />
        ) : null}

        <div className="admin-list">
          <div className="admin-list-toolbar">
            <div className="text-sm text-slate-500">
              {locations.length.toLocaleString()} location{locations.length === 1 ? '' : 's'}
            </div>
          </div>
          <div className="admin-list-table-wrap">
            <table className="admin-list-table">
              <thead className="admin-list-head">
                <tr>
                  <th className="admin-list-header-cell">Location</th>
                  <th className="admin-list-header-cell">Address</th>
                  <th className="admin-list-header-cell">Contact</th>
                  <th className="admin-list-header-cell">Visibility</th>
                  <th className="admin-list-header-cell">Primary</th>
                  <th className="admin-list-header-cell">Actions</th>
                </tr>
              </thead>
              <tbody>
                {locations.length > 0 ? (
                  locations.map((location) => {
                    const addressLines = formatAddress(location);
                    const contactLines = formatContact(location);
                    const isExpanded = expandedLocationId === location.id;
                    const form = editingForms[location.id] ?? buildLocationFormState(location);
                    const isSaving =
                      savingKey === `location-${location.id}` ||
                      savingKey === `delete-location-${location.id}`;

                    return (
                      <Fragment key={location.id}>
                        <tr key={location.id} className="admin-list-row">
                          <td className="admin-list-cell">
                            <div className="space-y-1">
                              <div className="font-semibold text-slate-950">
                                {location.label || location.addressLine1 || 'Location'}
                              </div>
                              <div className="text-sm text-slate-500">
                                {location.municipality || 'No municipality set'}
                              </div>
                            </div>
                          </td>
                          <td className="admin-list-cell">
                            {addressLines.length > 0 ? (
                              <div className="space-y-1 text-sm text-slate-700">
                                {addressLines.map((line) => (
                                  <div key={line}>{line}</div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400">No address set</span>
                            )}
                          </td>
                          <td className="admin-list-cell">
                            {contactLines.length > 0 ? (
                              <div className="space-y-1 text-sm text-slate-700">
                                {contactLines.map((line) => (
                                  <div key={line}>{line}</div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400">No contact details</span>
                            )}
                          </td>
                          <td className="admin-list-cell">
                            <AdminChip tone={location.isPublic ? 'ok' : 'neu'}>
                              {location.isPublic ? 'Public' : 'Private'}
                            </AdminChip>
                          </td>
                          <td className="admin-list-cell">
                            {location.isPrimary ? (
                              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-700">
                                <Star className="h-4 w-4 fill-current" aria-hidden="true" />
                                Primary
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="admin-list-cell">
                            <div className="flex justify-end">
                              <CrudActionButton
                                type="button"
                                variant="inline"
                                icon={isExpanded ? ChevronUp : ChevronDown}
                                label={isExpanded ? 'Collapse location editor' : 'Manage location'}
                                onClick={() => {
                                  setError('');
                                  setSuccess('');
                                  setExpandedLocationId((current) => (current === location.id ? null : location.id));
                                  resetLocationForm(location);
                                }}
                              >
                                {isExpanded ? 'Collapse' : 'Manage'}
                              </CrudActionButton>
                            </div>
                          </td>
                        </tr>
                        {isExpanded ? (
                          <tr>
                            <td colSpan={6} className="bg-[var(--hl-admin-surface-muted)] px-4 py-4">
                              <LocationEditor
                                title={location.label || location.addressLine1 || 'Edit location'}
                                description="Update the address, contact details, and visibility for this location."
                                form={form}
                                setForm={(value) =>
                                  setEditingForms((current) => ({
                                    ...current,
                                    [location.id]: value,
                                  }))
                                }
                                isSaving={isSaving}
                                onSubmit={() => saveLocation(location.id)}
                                onCancel={() => {
                                  resetLocationForm(location);
                                  setExpandedLocationId(null);
                                }}
                                onDelete={() => deleteLocation(location.id)}
                              />
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })
                ) : (
                  <tr className="admin-list-row">
                    <td className="admin-list-empty" colSpan={6}>
                      <div className="flex flex-col items-center gap-3 text-center">
                        <p>No locations yet. Add the first public-facing location for this organization.</p>
                        <CrudActionButton
                          type="button"
                          variant="primary"
                          icon={Plus}
                          label="Add your first location"
                          onClick={() => {
                            setError('');
                            setSuccess('');
                            setExpandedLocationId('new');
                          }}
                        >
                          Add Your First Location
                        </CrudActionButton>
                      </div>
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
