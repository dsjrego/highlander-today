'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import ImageUpload from '@/components/shared/ImageUpload';
import { formatOrganizationTypeLabel } from '@/lib/organizations';
import { formatPhoneInput } from '@/lib/organization-admin';
import {
  ORGANIZATION_GROUP_OPTIONS,
  ORGANIZATION_TYPE_OPTIONS,
  type OrganizationDirectoryGroup,
} from '@/lib/organization-taxonomy';

type OrganizationStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
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
const ORGANIZATION_DETAIL_TABS = ['details', 'locations', 'departments', 'contacts', 'members', 'events'] as const;
type OrganizationDetailTab = (typeof ORGANIZATION_DETAIL_TABS)[number];

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

interface DepartmentRecord {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  websiteUrl: string | null;
  hoursSummary: string | null;
  isPublic: boolean;
  sortOrder: number;
  locationId: string | null;
}

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
  departmentId: string | null;
  locationId: string | null;
  userId: string | null;
}

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

interface OrganizationEventRecord {
  id: string;
  title: string;
  status: 'PENDING_REVIEW' | 'PUBLISHED' | 'UNPUBLISHED';
  startDatetime: Date;
  endDatetime: Date | null;
  venueLabel: string | null;
  location: {
    id: string;
    name: string | null;
    addressLine1: string;
    city: string;
    state: string;
  } | null;
}

interface OrganizationDetailRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  websiteUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  directoryGroup: OrganizationDirectoryGroup;
  organizationType: string;
  status: OrganizationStatus;
  isPublicMemberRoster: boolean;
  locations: LocationRecord[];
  departments: DepartmentRecord[];
  contacts: ContactRecord[];
  memberships: MembershipRecord[];
  events: OrganizationEventRecord[];
}

interface OrganizationDetailEditorProps {
  organization: OrganizationDetailRecord;
}

interface CoreFormState {
  name: string;
  description: string;
  logoUrl: string;
  bannerUrl: string;
  websiteUrl: string;
  contactEmail: string;
  contactPhone: string;
  directoryGroup: OrganizationDirectoryGroup;
  organizationType: string;
  isPublicMemberRoster: boolean;
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

interface DepartmentFormState {
  name: string;
  slug: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
  websiteUrl: string;
  hoursSummary: string;
  isPublic: boolean;
  sortOrder: string;
  locationId: string;
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
  departmentId: string;
  locationId: string;
  userId: string;
}

function buildCoreFormState(organization: OrganizationDetailRecord): CoreFormState {
  return {
    name: organization.name,
    description: organization.description || '',
    logoUrl: organization.logoUrl || '',
    bannerUrl: organization.bannerUrl || '',
    websiteUrl: organization.websiteUrl || '',
    contactEmail: organization.contactEmail || '',
    contactPhone: organization.contactPhone || '',
    directoryGroup: organization.directoryGroup,
    organizationType: organization.organizationType,
    isPublicMemberRoster: organization.isPublicMemberRoster,
  };
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

function buildDepartmentFormState(department?: DepartmentRecord): DepartmentFormState {
  return {
    name: department?.name || '',
    slug: department?.slug || '',
    description: department?.description || '',
    contactEmail: department?.contactEmail || '',
    contactPhone: department?.contactPhone || '',
    websiteUrl: department?.websiteUrl || '',
    hoursSummary: department?.hoursSummary || '',
    isPublic: department?.isPublic ?? true,
    sortOrder: String(department?.sortOrder ?? 0),
    locationId: department?.locationId || '',
  };
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
    departmentId: contact?.departmentId || '',
    locationId: contact?.locationId || '',
    userId: contact?.userId || '',
  };
}

function formatDateValue(value: string | number) {
  return String(value).trim();
}

function formatTabLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatEventStatusLabel(status: OrganizationEventRecord['status']) {
  switch (status) {
    case 'PUBLISHED':
      return 'Approved';
    case 'UNPUBLISHED':
      return 'Archived';
    default:
      return 'Pending';
  }
}

function formatEventDate(value: Date | null) {
  if (!value) {
    return 'No date set';
  }

  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatEventLocation(event: OrganizationEventRecord) {
  if (event.venueLabel?.trim()) {
    return event.venueLabel.trim();
  }

  if (event.location?.name?.trim()) {
    return event.location.name.trim();
  }

  if (event.location?.addressLine1?.trim()) {
    return `${event.location.addressLine1}, ${event.location.city}, ${event.location.state}`;
  }

  return 'No location set';
}

export default function OrganizationDetailEditor({ organization: initialOrganization }: OrganizationDetailEditorProps) {
  const [organization, setOrganization] = useState(initialOrganization);
  const [activeTab, setActiveTab] = useState<OrganizationDetailTab>('details');
  const [coreForm, setCoreForm] = useState<CoreFormState>(() => buildCoreFormState(initialOrganization));
  const [coreError, setCoreError] = useState('');
  const [coreSuccess, setCoreSuccess] = useState('');
  const [isSavingCore, setIsSavingCore] = useState(false);

  const [newLocationForm, setNewLocationForm] = useState<LocationFormState>(() => buildLocationFormState());
  const [newDepartmentForm, setNewDepartmentForm] = useState<DepartmentFormState>(() => buildDepartmentFormState());
  const [newContactForm, setNewContactForm] = useState<ContactFormState>(() => buildContactFormState());
  const [sectionError, setSectionError] = useState('');
  const [sectionSuccess, setSectionSuccess] = useState('');
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const activeMemberships = organization.memberships.filter((membership) => membership.status === 'ACTIVE');
  const organizationTypeOptions = ORGANIZATION_TYPE_OPTIONS[coreForm.directoryGroup];

  function setFlashError(message: string) {
    setSectionSuccess('');
    setSectionError(message);
  }

  function setFlashSuccess(message: string) {
    setSectionError('');
    setSectionSuccess(message);
  }

  function handleCoreInputChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = event.target;

    if (name === 'directoryGroup') {
      const nextGroup = value as OrganizationDirectoryGroup;
      setCoreForm((current) => ({
        ...current,
        directoryGroup: nextGroup,
        organizationType: ORGANIZATION_TYPE_OPTIONS[nextGroup][0].value,
      }));
      return;
    }

    if (name === 'contactPhone') {
      setCoreForm((current) => ({
        ...current,
        contactPhone: formatPhoneInput(value),
      }));
      return;
    }

    setCoreForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleCoreCheckboxChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { name, checked } = event.target;
    setCoreForm((current) => ({
      ...current,
      [name]: checked,
    }));
  }

  async function handleSaveCore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCoreError('');
    setCoreSuccess('');
    setIsSavingCore(true);

    try {
      const response = await fetch(`/api/admin/organizations/${organization.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(coreForm),
      });

      const data = await response.json();

      if (!response.ok) {
        const validationMessage = Array.isArray(data.details)
          ? data.details.map((detail: { message?: string }) => detail.message).filter(Boolean).join(', ')
          : '';
        throw new Error(validationMessage || data.error || 'Failed to update organization');
      }

      setOrganization((current) => ({
        ...current,
        ...data.organization,
      }));
      setCoreForm((current) => ({
        ...current,
        ...buildCoreFormState({ ...organization, ...data.organization }),
      }));
      setCoreSuccess('Organization details saved.');
    } catch (error) {
      setCoreError(error instanceof Error ? error.message : 'Failed to update organization');
    } finally {
      setIsSavingCore(false);
    }
  }

  async function createLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingKey('new-location');
    setFlashError('');

    try {
      const response = await fetch(`/api/admin/organizations/${organization.id}/locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLocationForm),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create location');
      }

      setOrganization((current) => ({
        ...current,
        locations: [...current.locations.map((location) => (data.location.isPrimary ? { ...location, isPrimary: false } : location)), data.location].sort(
          (a, b) => (a.isPrimary === b.isPrimary ? a.sortOrder - b.sortOrder : a.isPrimary ? -1 : 1)
        ),
      }));
      setNewLocationForm(buildLocationFormState());
      setFlashSuccess('Location added.');
    } catch (error) {
      setFlashError(error instanceof Error ? error.message : 'Failed to create location');
    } finally {
      setSavingKey(null);
    }
  }

  async function saveLocation(locationId: string, form: LocationFormState) {
    setSavingKey(`location-${locationId}`);
    setFlashError('');

    try {
      const response = await fetch(`/api/admin/organizations/${organization.id}/locations/${locationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update location');
      }

      setOrganization((current) => ({
        ...current,
        locations: current.locations
          .map((location) => (data.location.isPrimary && location.id !== locationId ? { ...location, isPrimary: false } : location))
          .map((location) => (location.id === locationId ? data.location : location))
          .sort((a, b) => (a.isPrimary === b.isPrimary ? a.sortOrder - b.sortOrder : a.isPrimary ? -1 : 1)),
      }));
      setFlashSuccess('Location updated.');
    } catch (error) {
      setFlashError(error instanceof Error ? error.message : 'Failed to update location');
    } finally {
      setSavingKey(null);
    }
  }

  async function deleteLocation(locationId: string) {
    setSavingKey(`delete-location-${locationId}`);
    setFlashError('');

    try {
      const response = await fetch(`/api/admin/organizations/${organization.id}/locations/${locationId}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete location');
      }

      setOrganization((current) => ({
        ...current,
        locations: current.locations.filter((location) => location.id !== locationId),
        departments: current.departments.map((department) =>
          department.locationId === locationId ? { ...department, locationId: null } : department
        ),
        contacts: current.contacts.map((contact) =>
          contact.locationId === locationId ? { ...contact, locationId: null } : contact
        ),
      }));
      setFlashSuccess('Location deleted.');
    } catch (error) {
      setFlashError(error instanceof Error ? error.message : 'Failed to delete location');
    } finally {
      setSavingKey(null);
    }
  }

  async function createDepartment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingKey('new-department');
    setFlashError('');

    try {
      const response = await fetch(`/api/admin/organizations/${organization.id}/departments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDepartmentForm),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create department');
      }

      setOrganization((current) => ({
        ...current,
        departments: [...current.departments, data.department].sort((a, b) => a.sortOrder - b.sortOrder),
      }));
      setNewDepartmentForm(buildDepartmentFormState());
      setFlashSuccess('Department added.');
    } catch (error) {
      setFlashError(error instanceof Error ? error.message : 'Failed to create department');
    } finally {
      setSavingKey(null);
    }
  }

  async function saveDepartment(departmentId: string, form: DepartmentFormState) {
    setSavingKey(`department-${departmentId}`);
    setFlashError('');

    try {
      const response = await fetch(`/api/admin/organizations/${organization.id}/departments/${departmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update department');
      }

      setOrganization((current) => ({
        ...current,
        departments: current.departments
          .map((department) => (department.id === departmentId ? data.department : department))
          .sort((a, b) => a.sortOrder - b.sortOrder),
      }));
      setFlashSuccess('Department updated.');
    } catch (error) {
      setFlashError(error instanceof Error ? error.message : 'Failed to update department');
    } finally {
      setSavingKey(null);
    }
  }

  async function deleteDepartment(departmentId: string) {
    setSavingKey(`delete-department-${departmentId}`);
    setFlashError('');

    try {
      const response = await fetch(`/api/admin/organizations/${organization.id}/departments/${departmentId}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete department');
      }

      setOrganization((current) => ({
        ...current,
        departments: current.departments.filter((department) => department.id !== departmentId),
        contacts: current.contacts.map((contact) =>
          contact.departmentId === departmentId ? { ...contact, departmentId: null } : contact
        ),
      }));
      setFlashSuccess('Department deleted.');
    } catch (error) {
      setFlashError(error instanceof Error ? error.message : 'Failed to delete department');
    } finally {
      setSavingKey(null);
    }
  }

  async function createContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingKey('new-contact');
    setFlashError('');

    try {
      const response = await fetch(`/api/admin/organizations/${organization.id}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newContactForm),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create contact');
      }

      setOrganization((current) => ({
        ...current,
        contacts: [...current.contacts, data.contact].sort((a, b) => a.sortOrder - b.sortOrder),
      }));
      setNewContactForm(buildContactFormState());
      setFlashSuccess('Contact added.');
    } catch (error) {
      setFlashError(error instanceof Error ? error.message : 'Failed to create contact');
    } finally {
      setSavingKey(null);
    }
  }

  async function saveContact(contactId: string, form: ContactFormState) {
    setSavingKey(`contact-${contactId}`);
    setFlashError('');

    try {
      const response = await fetch(`/api/admin/organizations/${organization.id}/contacts/${contactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update contact');
      }

      setOrganization((current) => ({
        ...current,
        contacts: current.contacts.map((contact) => (contact.id === contactId ? data.contact : contact)),
      }));
      setFlashSuccess('Contact updated.');
    } catch (error) {
      setFlashError(error instanceof Error ? error.message : 'Failed to update contact');
    } finally {
      setSavingKey(null);
    }
  }

  async function deleteContact(contactId: string) {
    setSavingKey(`delete-contact-${contactId}`);
    setFlashError('');

    try {
      const response = await fetch(`/api/admin/organizations/${organization.id}/contacts/${contactId}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete contact');
      }

      setOrganization((current) => ({
        ...current,
        contacts: current.contacts.filter((contact) => contact.id !== contactId),
      }));
      setFlashSuccess('Contact deleted.');
    } catch (error) {
      setFlashError(error instanceof Error ? error.message : 'Failed to delete contact');
    } finally {
      setSavingKey(null);
    }
  }

  async function saveMembership(membershipId: string, values: Pick<MembershipRecord, 'title' | 'isPublic' | 'isPrimaryContact'>) {
    setSavingKey(`membership-${membershipId}`);
    setFlashError('');

    try {
      const response = await fetch(`/api/admin/organizations/${organization.id}/memberships/${membershipId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update membership');
      }

      setOrganization((current) => ({
        ...current,
        memberships: current.memberships.map((membership) => {
          if (data.membership.isPrimaryContact && membership.id !== membershipId) {
            return { ...membership, isPrimaryContact: false };
          }

          return membership.id === membershipId ? { ...membership, ...data.membership } : membership;
        }),
      }));
      setFlashSuccess('Membership visibility updated.');
    } catch (error) {
      setFlashError(error instanceof Error ? error.message : 'Failed to update membership');
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="space-y-6">
      {sectionError ? <p className="text-sm font-medium text-rose-600">{sectionError}</p> : null}
      {sectionSuccess ? <p className="text-sm font-medium text-emerald-600">{sectionSuccess}</p> : null}

      <div className="space-y-0">
        <div className="relative top-[2px] flex flex-wrap gap-0 pb-0">
          {ORGANIZATION_DETAIL_TABS.map((tab) => {
            const isActive = tab === activeTab;

            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`admin-card-tab ${isActive ? 'admin-card-tab-active' : 'admin-card-tab-inactive'}`}
              >
                {formatTabLabel(tab)}
              </button>
            );
          })}
        </div>

        <div className="admin-card-tab-body">
          {activeTab === 'details' ? (
            <form onSubmit={handleSaveCore} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">Organization Profile</h2>
                  <p className="mt-1 text-sm text-slate-600">Edit the canonical public details for this organization.</p>
                </div>
                <button
                  type="submit"
                  disabled={isSavingCore}
                  className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {isSavingCore ? 'Saving...' : 'Save Profile'}
                </button>
              </div>

              <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
                <div>
                  <ImageUpload
                    context="organization"
                    maxFiles={1}
                    singleCard
                    value={coreForm.bannerUrl ? [coreForm.bannerUrl] : []}
                    onUpload={(image) =>
                      setCoreForm((current) => ({
                        ...current,
                        bannerUrl: image.url,
                      }))
                    }
                    onRemove={() =>
                      setCoreForm((current) => ({
                        ...current,
                        bannerUrl: '',
                      }))
                    }
                    label="Banner Image"
                    labelClassName="form-label"
                    helperText="Upload the banner image used on the organization profile."
                  />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <label className="form-label text-slate-500">Organization Name</label>
                    <input name="name" value={coreForm.name} onChange={handleCoreInputChange} className="form-input" />
                  </div>
                  <div>
                    <label className="form-label text-slate-500">Slug</label>
                    <div className="form-input bg-slate-50 text-slate-500">{organization.slug}</div>
                  </div>
                  <div>
                    <label className="form-label text-slate-500">Group</label>
                    <select name="directoryGroup" value={coreForm.directoryGroup} onChange={handleCoreInputChange} className="form-input">
                      {ORGANIZATION_GROUP_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label text-slate-500">Type</label>
                    <select name="organizationType" value={coreForm.organizationType} onChange={handleCoreInputChange} className="form-input">
                      {organizationTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label text-slate-500">Website</label>
                    <input name="websiteUrl" value={coreForm.websiteUrl} onChange={handleCoreInputChange} className="form-input" />
                  </div>
                  <div>
                    <label className="form-label text-slate-500">Contact Email</label>
                    <input name="contactEmail" value={coreForm.contactEmail} onChange={handleCoreInputChange} className="form-input" />
                  </div>
                  <div>
                    <label className="form-label text-slate-500">Contact Phone</label>
                    <input name="contactPhone" value={coreForm.contactPhone} onChange={handleCoreInputChange} className="form-input" />
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
                    <input
                      id="isPublicMemberRoster"
                      type="checkbox"
                      name="isPublicMemberRoster"
                      checked={coreForm.isPublicMemberRoster}
                      onChange={handleCoreCheckboxChange}
                      className="h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-300"
                    />
                    <label htmlFor="isPublicMemberRoster" className="text-sm font-medium text-slate-700">
                      Public member roster
                    </label>
                  </div>
                  <div className="lg:col-span-2">
                    <label className="form-label text-slate-500">Logo URL</label>
                    <input name="logoUrl" value={coreForm.logoUrl} onChange={handleCoreInputChange} className="form-input" />
                  </div>
                  <div className="lg:col-span-2">
                    <label className="form-label text-slate-500">Description</label>
                    <textarea
                      name="description"
                      value={coreForm.description}
                      onChange={handleCoreInputChange}
                      rows={5}
                      className="form-input min-h-[140px]"
                    />
                  </div>
                </div>
              </div>

              {coreError ? <p className="mt-4 text-sm font-medium text-rose-600">{coreError}</p> : null}
              {coreSuccess ? <p className="mt-4 text-sm font-medium text-emerald-600">{coreSuccess}</p> : null}
            </form>
          ) : null}

          {activeTab === 'locations' ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-bold text-slate-950">Locations</h2>
              <p className="mt-1 text-sm text-slate-600">Manage public locations, hours, and local contact points.</p>

              <div className="mt-4 space-y-4">
                {organization.locations.map((location) => (
                  <LocationEditor
                    key={location.id}
                    location={location}
                    isSaving={savingKey === `location-${location.id}` || savingKey === `delete-location-${location.id}`}
                    onSave={saveLocation}
                    onDelete={deleteLocation}
                  />
                ))}
              </div>

              <form onSubmit={createLocation} className="mt-5 space-y-3 rounded-2xl border border-dashed border-slate-300 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Add Location</h3>
                <LocationFields value={newLocationForm} onChange={setNewLocationForm} />
                <button
                  type="submit"
                  disabled={savingKey === 'new-location'}
                  className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {savingKey === 'new-location' ? 'Adding...' : 'Add Location'}
                </button>
              </form>
            </section>
          ) : null}

          {activeTab === 'departments' ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-bold text-slate-950">Departments</h2>
              <p className="mt-1 text-sm text-slate-600">Add public-facing departments or internal divisions.</p>

              <div className="mt-4 space-y-4">
                {organization.departments.map((department) => (
                  <DepartmentEditor
                    key={department.id}
                    department={department}
                    locations={organization.locations}
                    isSaving={savingKey === `department-${department.id}` || savingKey === `delete-department-${department.id}`}
                    onSave={saveDepartment}
                    onDelete={deleteDepartment}
                  />
                ))}
              </div>

              <form onSubmit={createDepartment} className="mt-5 space-y-3 rounded-2xl border border-dashed border-slate-300 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Add Department</h3>
                <DepartmentFields value={newDepartmentForm} locations={organization.locations} onChange={setNewDepartmentForm} />
                <button
                  type="submit"
                  disabled={savingKey === 'new-department'}
                  className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {savingKey === 'new-department' ? 'Adding...' : 'Add Department'}
                </button>
              </form>
            </section>
          ) : null}

          {activeTab === 'contacts' ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-bold text-slate-950">Contacts</h2>
              <p className="mt-1 text-sm text-slate-600">Create the public contact records shown on the organization page.</p>

              <div className="mt-4 space-y-4">
                {organization.contacts.map((contact) => (
                  <ContactEditor
                    key={contact.id}
                    contact={contact}
                    locations={organization.locations}
                    departments={organization.departments}
                    memberships={activeMemberships}
                    isSaving={savingKey === `contact-${contact.id}` || savingKey === `delete-contact-${contact.id}`}
                    onSave={saveContact}
                    onDelete={deleteContact}
                  />
                ))}
              </div>

              <form onSubmit={createContact} className="mt-5 space-y-3 rounded-2xl border border-dashed border-slate-300 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Add Contact</h3>
                <ContactFields
                  value={newContactForm}
                  departments={organization.departments}
                  locations={organization.locations}
                  memberships={activeMemberships}
                  onChange={setNewContactForm}
                />
                <button
                  type="submit"
                  disabled={savingKey === 'new-contact'}
                  className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {savingKey === 'new-contact' ? 'Adding...' : 'Add Contact'}
                </button>
              </form>
            </section>
          ) : null}

          {activeTab === 'members' ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-bold text-slate-950">Members</h2>
              <p className="mt-1 text-sm text-slate-600">Choose which attached people can appear on the public roster.</p>

              <div className="mt-4 space-y-4">
                {organization.memberships.map((membership) => (
                  <MembershipEditor
                    key={membership.id}
                    membership={membership}
                    isSaving={savingKey === `membership-${membership.id}`}
                    onSave={saveMembership}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {activeTab === 'events' ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-bold text-slate-950">Events</h2>
              <p className="mt-1 text-sm text-slate-600">Review events currently linked to this organization.</p>

              <div className="mt-4 space-y-4">
                {organization.events.length > 0 ? (
                  organization.events.map((event) => (
                    <div key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <Link href={`/admin/events/${event.id}`} className="text-sm font-semibold text-slate-950 hover:text-[#A51E30]">
                            {event.title}
                          </Link>
                          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                            {formatEventStatusLabel(event.status)}
                          </p>
                        </div>
                        <Link href={`/admin/events/${event.id}`} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-900">
                          Open Event
                        </Link>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Start</p>
                          <p className="mt-1 text-sm text-slate-700">{formatEventDate(event.startDatetime)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Location</p>
                          <p className="mt-1 text-sm text-slate-700">{formatEventLocation(event)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-5 text-sm text-slate-600">
                    No events are currently linked to this organization.
                  </div>
                )}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function BooleanInput({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-300"
      />
      <span>{label}</span>
    </label>
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
    <div className="grid gap-3 md:grid-cols-2">
      <input placeholder="Label" value={value.label} onChange={(event) => onChange({ ...value, label: event.target.value })} className="form-input" />
      <input placeholder="Address line 1" value={value.addressLine1} onChange={(event) => onChange({ ...value, addressLine1: event.target.value })} className="form-input" />
      <input placeholder="Address line 2" value={value.addressLine2} onChange={(event) => onChange({ ...value, addressLine2: event.target.value })} className="form-input" />
      <input placeholder="City" value={value.city} onChange={(event) => onChange({ ...value, city: event.target.value })} className="form-input" />
      <input placeholder="State" value={value.state} onChange={(event) => onChange({ ...value, state: event.target.value })} className="form-input" />
      <input placeholder="Postal code" value={value.postalCode} onChange={(event) => onChange({ ...value, postalCode: event.target.value })} className="form-input" />
      <input placeholder="Municipality" value={value.municipality} onChange={(event) => onChange({ ...value, municipality: event.target.value })} className="form-input" />
      <input placeholder="Contact email" value={value.contactEmail} onChange={(event) => onChange({ ...value, contactEmail: event.target.value })} className="form-input" />
      <input
        placeholder="Contact phone"
        value={value.contactPhone}
        onChange={(event) => onChange({ ...value, contactPhone: formatPhoneInput(event.target.value) })}
        className="form-input"
      />
      <input placeholder="Website URL" value={value.websiteUrl} onChange={(event) => onChange({ ...value, websiteUrl: event.target.value })} className="form-input" />
      <input placeholder="Hours summary" value={value.hoursSummary} onChange={(event) => onChange({ ...value, hoursSummary: event.target.value })} className="form-input" />
      <input placeholder="Sort order" value={value.sortOrder} onChange={(event) => onChange({ ...value, sortOrder: formatDateValue(event.target.value) })} className="form-input" />
      <div className="md:col-span-2 flex flex-wrap gap-4">
        <BooleanInput checked={value.isPrimary} label="Primary location" onChange={(checked) => onChange({ ...value, isPrimary: checked })} />
        <BooleanInput checked={value.isPublic} label="Public" onChange={(checked) => onChange({ ...value, isPublic: checked })} />
      </div>
    </div>
  );
}

function DepartmentFields({
  value,
  locations,
  onChange,
}: {
  value: DepartmentFormState;
  locations: LocationRecord[];
  onChange: (value: DepartmentFormState) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <input placeholder="Department name" value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value })} className="form-input" />
      <input placeholder="Slug" value={value.slug} onChange={(event) => onChange({ ...value, slug: event.target.value })} className="form-input" />
      <textarea
        placeholder="Description"
        value={value.description}
        onChange={(event) => onChange({ ...value, description: event.target.value })}
        rows={3}
        className="form-input md:col-span-2"
      />
      <input placeholder="Contact email" value={value.contactEmail} onChange={(event) => onChange({ ...value, contactEmail: event.target.value })} className="form-input" />
      <input
        placeholder="Contact phone"
        value={value.contactPhone}
        onChange={(event) => onChange({ ...value, contactPhone: formatPhoneInput(event.target.value) })}
        className="form-input"
      />
      <input placeholder="Website URL" value={value.websiteUrl} onChange={(event) => onChange({ ...value, websiteUrl: event.target.value })} className="form-input" />
      <input placeholder="Hours summary" value={value.hoursSummary} onChange={(event) => onChange({ ...value, hoursSummary: event.target.value })} className="form-input" />
      <select value={value.locationId} onChange={(event) => onChange({ ...value, locationId: event.target.value })} className="form-input">
        <option value="">No linked location</option>
        {locations.map((location) => (
          <option key={location.id} value={location.id}>
            {location.label || location.addressLine1 || 'Location'}
          </option>
        ))}
      </select>
      <input placeholder="Sort order" value={value.sortOrder} onChange={(event) => onChange({ ...value, sortOrder: formatDateValue(event.target.value) })} className="form-input" />
      <div className="md:col-span-2">
        <BooleanInput checked={value.isPublic} label="Public department" onChange={(checked) => onChange({ ...value, isPublic: checked })} />
      </div>
    </div>
  );
}

function ContactFields({
  value,
  departments,
  locations,
  memberships,
  onChange,
}: {
  value: ContactFormState;
  departments: DepartmentRecord[];
  locations: LocationRecord[];
  memberships: MembershipRecord[];
  onChange: (value: ContactFormState) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <input placeholder="Label" value={value.label} onChange={(event) => onChange({ ...value, label: event.target.value })} className="form-input" />
      <input placeholder="Name" value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value })} className="form-input" />
      <input placeholder="Title" value={value.title} onChange={(event) => onChange({ ...value, title: event.target.value })} className="form-input" />
      <input placeholder="Email" value={value.email} onChange={(event) => onChange({ ...value, email: event.target.value })} className="form-input" />
      <input
        placeholder="Phone"
        value={value.phone}
        onChange={(event) => onChange({ ...value, phone: formatPhoneInput(event.target.value) })}
        className="form-input"
      />
      <input placeholder="Website URL" value={value.websiteUrl} onChange={(event) => onChange({ ...value, websiteUrl: event.target.value })} className="form-input" />
      <select value={value.departmentId} onChange={(event) => onChange({ ...value, departmentId: event.target.value })} className="form-input">
        <option value="">No department</option>
        {departments.map((department) => (
          <option key={department.id} value={department.id}>
            {department.name}
          </option>
        ))}
      </select>
      <select value={value.locationId} onChange={(event) => onChange({ ...value, locationId: event.target.value })} className="form-input">
        <option value="">No location</option>
        {locations.map((location) => (
          <option key={location.id} value={location.id}>
            {location.label || location.addressLine1 || 'Location'}
          </option>
        ))}
      </select>
      <select value={value.userId} onChange={(event) => onChange({ ...value, userId: event.target.value })} className="form-input">
        <option value="">No linked member</option>
        {memberships.map((membership) => (
          <option key={membership.id} value={membership.user.id}>
            {membership.user.firstName} {membership.user.lastName}
          </option>
        ))}
      </select>
      <input placeholder="Sort order" value={value.sortOrder} onChange={(event) => onChange({ ...value, sortOrder: formatDateValue(event.target.value) })} className="form-input" />
      <div className="md:col-span-2">
        <BooleanInput checked={value.isPublic} label="Public contact" onChange={(checked) => onChange({ ...value, isPublic: checked })} />
      </div>
    </div>
  );
}

function LocationEditor({
  location,
  isSaving,
  onSave,
  onDelete,
}: {
  location: LocationRecord;
  isSaving: boolean;
  onSave: (locationId: string, form: LocationFormState) => Promise<void>;
  onDelete: (locationId: string) => Promise<void>;
}) {
  const [form, setForm] = useState<LocationFormState>(() => buildLocationFormState(location));

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave(location.id, form);
      }}
      className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-950">{location.label || location.addressLine1 || 'Location'}</h3>
        <div className="flex gap-2">
          <button type="submit" disabled={isSaving} className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 border border-slate-200">
            Save
          </button>
          <button type="button" disabled={isSaving} onClick={() => onDelete(location.id)} className="rounded-lg bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-700 border border-rose-200">
            Delete
          </button>
        </div>
      </div>
      <LocationFields value={form} onChange={setForm} />
    </form>
  );
}

function DepartmentEditor({
  department,
  locations,
  isSaving,
  onSave,
  onDelete,
}: {
  department: DepartmentRecord;
  locations: LocationRecord[];
  isSaving: boolean;
  onSave: (departmentId: string, form: DepartmentFormState) => Promise<void>;
  onDelete: (departmentId: string) => Promise<void>;
}) {
  const [form, setForm] = useState<DepartmentFormState>(() => buildDepartmentFormState(department));

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave(department.id, form);
      }}
      className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-950">{department.name}</h3>
        <div className="flex gap-2">
          <button type="submit" disabled={isSaving} className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 border border-slate-200">
            Save
          </button>
          <button type="button" disabled={isSaving} onClick={() => onDelete(department.id)} className="rounded-lg bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-700 border border-rose-200">
            Delete
          </button>
        </div>
      </div>
      <DepartmentFields value={form} locations={locations} onChange={setForm} />
    </form>
  );
}

function ContactEditor({
  contact,
  departments,
  locations,
  memberships,
  isSaving,
  onSave,
  onDelete,
}: {
  contact: ContactRecord;
  departments: DepartmentRecord[];
  locations: LocationRecord[];
  memberships: MembershipRecord[];
  isSaving: boolean;
  onSave: (contactId: string, form: ContactFormState) => Promise<void>;
  onDelete: (contactId: string) => Promise<void>;
}) {
  const [form, setForm] = useState<ContactFormState>(() => buildContactFormState(contact));

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave(contact.id, form);
      }}
      className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-950">{contact.name || contact.label || 'Contact'}</h3>
        <div className="flex gap-2">
          <button type="submit" disabled={isSaving} className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 border border-slate-200">
            Save
          </button>
          <button type="button" disabled={isSaving} onClick={() => onDelete(contact.id)} className="rounded-lg bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-700 border border-rose-200">
            Delete
          </button>
        </div>
      </div>
      <ContactFields value={form} departments={departments} locations={locations} memberships={memberships} onChange={setForm} />
    </form>
  );
}

function MembershipEditor({
  membership,
  isSaving,
  onSave,
}: {
  membership: MembershipRecord;
  isSaving: boolean;
  onSave: (membershipId: string, values: Pick<MembershipRecord, 'title' | 'isPublic' | 'isPrimaryContact'>) => Promise<void>;
}) {
  const [title, setTitle] = useState(membership.title || '');
  const [isPublic, setIsPublic] = useState(membership.isPublic);
  const [isPrimaryContact, setIsPrimaryContact] = useState(membership.isPrimaryContact);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave(membership.id, {
          title,
          isPublic,
          isPrimaryContact,
        });
      }}
      className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-950">
            {membership.user.firstName} {membership.user.lastName}
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
            {formatOrganizationTypeLabel(membership.role)} / {formatOrganizationTypeLabel(membership.status)}
          </p>
          <p className="mt-1 text-sm text-slate-500">{membership.user.email}</p>
        </div>
        <button type="submit" disabled={isSaving} className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 border border-slate-200">
          Save
        </button>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Public title override" className="form-input" />
        <div className="flex flex-wrap gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <BooleanInput checked={isPublic} label="Show on roster" onChange={setIsPublic} />
          <BooleanInput checked={isPrimaryContact} label="Primary contact" onChange={setIsPrimaryContact} />
        </div>
      </div>
    </form>
  );
}
