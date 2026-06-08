'use client';

import { Fragment, useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown, ChevronUp, Plus, Save, Trash2 } from 'lucide-react';
import { AdminChip } from '@/components/admin/AdminChip';
import { CrudActionButton } from '@/components/shared/CrudAction';
import StatusMessage from '@/components/shared/StatusMessage';
import { formatPhoneInput } from '@/lib/organization-admin';

interface ContactRecord {
  id: string;
  label: string | null;
  name: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  websiteUrl: string | null;
  isPublic: boolean;
  sortOrder: number;
  locationId: string | null;
  userId: string | null;
}

interface LocationRecord {
  id: string;
  label: string | null;
  addressLine1: string | null;
}

interface MembershipRecord {
  id: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface ContactFormState {
  label: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  websiteUrl: string;
  isPublic: boolean;
  sortOrder: string;
  locationId: string;
  userId: string;
}

function buildContactFormState(contact?: ContactRecord): ContactFormState {
  return {
    label: contact?.label || '',
    name: contact?.name || '',
    title: contact?.title || '',
    email: contact?.email || '',
    phone: contact?.phone || '',
    websiteUrl: contact?.websiteUrl || '',
    isPublic: contact?.isPublic ?? true,
    sortOrder: String(contact?.sortOrder ?? 0),
    locationId: contact?.locationId || '',
    userId: contact?.userId || '',
  };
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
    <label className="flex items-start justify-between gap-3 rounded-lg border border-[var(--hl-admin-border)] bg-[var(--hl-admin-surface-muted)] px-4 py-3">
      <div className="space-y-1">
        <span className="text-sm font-medium text-slate-800">{label}</span>
        <p className="text-xs text-slate-500">{hint}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-300"
      />
    </label>
  );
}

function ContactFields({
  value,
  locations,
  memberships,
  onChange,
}: {
  value: ContactFormState;
  locations: LocationRecord[];
  memberships: MembershipRecord[];
  onChange: (value: ContactFormState) => void;
}) {
  return (
    <div className="space-y-5">
      <fieldset className="space-y-4 rounded-lg border border-[var(--hl-admin-border)] p-4">
        <legend className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Identity</legend>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Label">
            <input
              value={value.label}
              onChange={(event) => onChange({ ...value, label: event.target.value })}
              className="form-input"
              placeholder="Front Desk, Booking Contact, Volunteer Lead..."
            />
          </Field>
          <Field label="Name" required>
            <input
              value={value.name}
              onChange={(event) => onChange({ ...value, name: event.target.value })}
              className="form-input"
              placeholder="Full name"
            />
          </Field>
          <Field label="Title">
            <input
              value={value.title}
              onChange={(event) => onChange({ ...value, title: event.target.value })}
              className="form-input"
              placeholder="Executive Director, Office Manager..."
            />
          </Field>
          <Field label="Sort order" required>
            <input
              value={value.sortOrder}
              onChange={(event) => onChange({ ...value, sortOrder: event.target.value.trim() })}
              className="form-input"
              inputMode="numeric"
              placeholder="0"
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-lg border border-[var(--hl-admin-border)] p-4">
        <legend className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Contact</legend>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Email">
            <input
              value={value.email}
              onChange={(event) => onChange({ ...value, email: event.target.value })}
              className="form-input"
              placeholder="contact@example.org"
            />
          </Field>
          <Field label="Phone">
            <input
              value={value.phone}
              onChange={(event) => onChange({ ...value, phone: formatPhoneInput(event.target.value) })}
              className="form-input"
              placeholder="(555) 555-5555"
            />
          </Field>
          <Field label="Website URL">
            <input
              value={value.websiteUrl}
              onChange={(event) => onChange({ ...value, websiteUrl: event.target.value })}
              className="form-input"
              placeholder="https://example.org/contact"
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-lg border border-[var(--hl-admin-border)] p-4">
        <legend className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Links & Visibility</legend>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Linked location">
            <select
              value={value.locationId}
              onChange={(event) => onChange({ ...value, locationId: event.target.value })}
              className="form-input"
            >
              <option value="">No location</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.label || location.addressLine1 || 'Location'}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Linked member">
            <select
              value={value.userId}
              onChange={(event) => onChange({ ...value, userId: event.target.value })}
              className="form-input"
            >
              <option value="">No linked member</option>
              {memberships.map((membership) => (
                <option key={membership.id} value={membership.user.id}>
                  {membership.user.firstName} {membership.user.lastName}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <ToggleField
          label="Public contact"
          hint="Allow this contact to appear on the public organization page."
          checked={value.isPublic}
          onChange={(checked) => onChange({ ...value, isPublic: checked })}
        />
      </fieldset>
    </div>
  );
}

function ContactEditor({
  title,
  description,
  form,
  setForm,
  locations,
  memberships,
  isSaving,
  onSubmit,
  onCancel,
  onDelete,
}: {
  title: string;
  description: string;
  form: ContactFormState;
  setForm: (value: ContactFormState) => void;
  locations: LocationRecord[];
  memberships: MembershipRecord[];
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

      <ContactFields value={form} locations={locations} memberships={memberships} onChange={setForm} />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--hl-admin-border)] pt-4">
        <div>
          {onDelete ? (
            <CrudActionButton
              type="button"
              variant="danger"
              icon={Trash2}
              label="Delete contact"
              disabled={isSaving}
              onClick={() => void onDelete()}
            >
              Delete
            </CrudActionButton>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <CrudActionButton
            type="button"
            variant="secondary"
            icon={ChevronUp}
            label="Cancel contact editing"
            disabled={isSaving}
            onClick={onCancel}
          >
            Cancel
          </CrudActionButton>
          <CrudActionButton type="submit" variant="primary" icon={Save} label="Save contact" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Contact'}
          </CrudActionButton>
        </div>
      </div>
    </form>
  );
}

function getLocationLabel(locationId: string | null, locations: LocationRecord[]) {
  if (!locationId) {
    return null;
  }

  const location = locations.find((entry) => entry.id === locationId);
  return location ? location.label || location.addressLine1 || 'Location' : null;
}

function getMemberLabel(userId: string | null, memberships: MembershipRecord[]) {
  if (!userId) {
    return null;
  }

  const membership = memberships.find((entry) => entry.user.id === userId);
  return membership ? `${membership.user.firstName} ${membership.user.lastName}` : null;
}

export default function WorkspaceOrganizationContactsManager({
  profileUserId,
  organizationId,
  initialContacts,
  locations,
  memberships,
}: {
  profileUserId: string;
  organizationId: string;
  initialContacts: ContactRecord[];
  locations: LocationRecord[];
  memberships: MembershipRecord[];
}) {
  const [contacts, setContacts] = useState(initialContacts);
  const [newContactForm, setNewContactForm] = useState<ContactFormState>(() => buildContactFormState());
  const [expandedContactId, setExpandedContactId] = useState<string | 'new' | null>(null);
  const [editingForms, setEditingForms] = useState<Record<string, ContactFormState>>(() =>
    Object.fromEntries(initialContacts.map((contact) => [contact.id, buildContactFormState(contact)]))
  );
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function resetContactForm(contact: ContactRecord) {
    setEditingForms((current) => ({
      ...current,
      [contact.id]: buildContactFormState(contact),
    }));
  }

  async function createContact() {
    setSavingKey('new-contact');
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/profile/${profileUserId}/workspace/organizations/${organizationId}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newContactForm),
      });
      const data = await response.json();

      if (!response.ok) {
        const validationMessage = Array.isArray(data.details)
          ? data.details.map((detail: { message?: string }) => detail.message).filter(Boolean).join(', ')
          : '';
        throw new Error(validationMessage || data.error || 'Failed to create contact');
      }

      setContacts((current) => [...current, data.contact].sort((a, b) => a.sortOrder - b.sortOrder));
      setEditingForms((current) => ({
        ...current,
        [data.contact.id]: buildContactFormState(data.contact),
      }));
      setNewContactForm(buildContactFormState());
      setExpandedContactId(null);
      setSuccess('Contact added.');
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create contact');
    } finally {
      setSavingKey(null);
    }
  }

  async function saveContact(contactId: string) {
    const form = editingForms[contactId];
    setSavingKey(`contact-${contactId}`);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/profile/${profileUserId}/workspace/organizations/${organizationId}/contacts/${contactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();

      if (!response.ok) {
        const validationMessage = Array.isArray(data.details)
          ? data.details.map((detail: { message?: string }) => detail.message).filter(Boolean).join(', ')
          : '';
        throw new Error(validationMessage || data.error || 'Failed to update contact');
      }

      setContacts((current) =>
        current.map((contact) => (contact.id === contactId ? data.contact : contact)).sort((a, b) => a.sortOrder - b.sortOrder)
      );
      resetContactForm(data.contact);
      setExpandedContactId(null);
      setSuccess('Contact updated.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to update contact');
    } finally {
      setSavingKey(null);
    }
  }

  async function deleteContact(contactId: string) {
    setSavingKey(`delete-contact-${contactId}`);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/profile/${profileUserId}/workspace/organizations/${organizationId}/contacts/${contactId}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete contact');
      }

      setContacts((current) => current.filter((contact) => contact.id !== contactId));
      setEditingForms((current) => {
        const next = { ...current };
        delete next[contactId];
        return next;
      });
      setExpandedContactId(null);
      setSuccess('Contact deleted.');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete contact');
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <section className="rounded-xl border border-[var(--hl-admin-border)] bg-white shadow-sm">
      <div className="border-b border-[var(--hl-admin-border)] px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Contacts</p>
            <h3 className="text-lg font-semibold text-slate-950">Manage contact details</h3>
            <p className="text-sm text-slate-600">
              Create the public-facing contact records shown on the organization page and optionally link them to a location or member.
            </p>
          </div>
          <CrudActionButton
            type="button"
            variant="primary"
            icon={expandedContactId === 'new' ? ChevronUp : Plus}
            label={expandedContactId === 'new' ? 'Close new contact editor' : 'Add contact'}
            onClick={() => {
              setError('');
              setSuccess('');
              setExpandedContactId((current) => (current === 'new' ? null : 'new'));
            }}
          >
            {expandedContactId === 'new' ? 'Close' : 'Add Contact'}
          </CrudActionButton>
        </div>
      </div>

      <div className="space-y-5 px-5 py-5">
        {error ? (
          <StatusMessage variant="error" title="Contact update failed">
            <p>{error}</p>
          </StatusMessage>
        ) : null}

        {success ? (
          <StatusMessage variant="success" title="Contacts updated">
            <p>{success}</p>
          </StatusMessage>
        ) : null}

        {expandedContactId === 'new' ? (
          <ContactEditor
            title="Add contact"
            description="Create a new public-facing contact record for this organization."
            form={newContactForm}
            setForm={setNewContactForm}
            locations={locations}
            memberships={memberships}
            isSaving={savingKey === 'new-contact'}
            onSubmit={createContact}
            onCancel={() => {
              setNewContactForm(buildContactFormState());
              setExpandedContactId(null);
            }}
          />
        ) : null}

        <div className="admin-list">
          <div className="admin-list-toolbar">
            <div className="text-sm text-slate-500">
              {contacts.length.toLocaleString()} contact{contacts.length === 1 ? '' : 's'}
            </div>
          </div>
          <div className="admin-list-table-wrap">
            <table className="admin-list-table">
              <thead className="admin-list-head">
                <tr>
                  <th className="admin-list-header-cell">Name</th>
                  <th className="admin-list-header-cell">Title</th>
                  <th className="admin-list-header-cell">Linked To</th>
                  <th className="admin-list-header-cell">Email</th>
                  <th className="admin-list-header-cell">Phone</th>
                  <th className="admin-list-header-cell">Public</th>
                  <th className="admin-list-header-cell">Actions</th>
                </tr>
              </thead>
              <tbody>
                {contacts.length > 0 ? (
                  contacts.map((contact) => {
                    const isExpanded = expandedContactId === contact.id;
                    const form = editingForms[contact.id] ?? buildContactFormState(contact);
                    const isSaving =
                      savingKey === `contact-${contact.id}` ||
                      savingKey === `delete-contact-${contact.id}`;
                    const locationLabel = getLocationLabel(contact.locationId, locations);
                    const memberLabel = getMemberLabel(contact.userId, memberships);

                    return (
                      <Fragment key={contact.id}>
                        <tr className="admin-list-row">
                          <td className="admin-list-cell">
                            <div className="space-y-1">
                              <div className="font-semibold text-slate-950">{contact.name || contact.label || 'Contact'}</div>
                              <div className="text-sm text-slate-500">{contact.label || 'No label set'}</div>
                            </div>
                          </td>
                          <td className="admin-list-cell">{contact.title || <span className="text-slate-400">-</span>}</td>
                          <td className="admin-list-cell">
                            <div className="flex flex-wrap gap-2">
                              {locationLabel ? <AdminChip tone="neu">{locationLabel}</AdminChip> : null}
                              {memberLabel ? <AdminChip tone="role">{memberLabel}</AdminChip> : null}
                              {!locationLabel && !memberLabel ? <span className="text-slate-400">Unlinked</span> : null}
                            </div>
                          </td>
                          <td className="admin-list-cell">{contact.email || <span className="text-slate-400">-</span>}</td>
                          <td className="admin-list-cell">{contact.phone || <span className="text-slate-400">-</span>}</td>
                          <td className="admin-list-cell">
                            <AdminChip tone={contact.isPublic ? 'ok' : 'neu'}>
                              {contact.isPublic ? 'Public' : 'Private'}
                            </AdminChip>
                          </td>
                          <td className="admin-list-cell">
                            <div className="flex justify-end">
                              <CrudActionButton
                                type="button"
                                variant="inline"
                                icon={isExpanded ? ChevronUp : ChevronDown}
                                label={isExpanded ? 'Collapse contact editor' : 'Manage contact'}
                                onClick={() => {
                                  setError('');
                                  setSuccess('');
                                  setExpandedContactId((current) => (current === contact.id ? null : contact.id));
                                  resetContactForm(contact);
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
                              <ContactEditor
                                title={contact.name || contact.label || 'Edit contact'}
                                description="Update the linked member/location, public visibility, and contact channels for this record."
                                form={form}
                                setForm={(value) =>
                                  setEditingForms((current) => ({
                                    ...current,
                                    [contact.id]: value,
                                  }))
                                }
                                locations={locations}
                                memberships={memberships}
                                isSaving={isSaving}
                                onSubmit={() => saveContact(contact.id)}
                                onCancel={() => {
                                  resetContactForm(contact);
                                  setExpandedContactId(null);
                                }}
                                onDelete={() => deleteContact(contact.id)}
                              />
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })
                ) : (
                  <tr className="admin-list-row">
                    <td className="admin-list-empty" colSpan={7}>
                      No contacts yet. Use “Add Contact” to create the first public-facing contact for this organization.
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
