'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { Building2, ListChecks, Plus, Save, Trash2 } from 'lucide-react';
import { CrudActionButton } from '@/components/shared/CrudAction';
import ImageUpload from '@/components/shared/ImageUpload';
import { formatOrganizationTypeLabel } from '@/lib/organizations';
import { formatPhoneInput } from '@/lib/organization-admin';
import type {
  OrganizationFormQuestionType,
  OrganizationFormStatus,
} from '@/lib/organization-forms';
import type { TrustLevelValue } from '@/lib/trust-access';
import {
  ORGANIZATION_GROUP_OPTIONS,
  ORGANIZATION_TYPE_OPTIONS,
  type OrganizationDirectoryGroup,
} from '@/lib/organization-taxonomy';
import OrganizationFormsManager from './OrganizationFormsManager';

const TipTapEditor = dynamic(() => import('@/components/articles/TipTapEditor'), {
  ssr: false,
});

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
const ORGANIZATION_DETAIL_TABS = ['details', 'locations', 'departments', 'contacts', 'members', 'events', 'forms'] as const;
type OrganizationDetailTab = (typeof ORGANIZATION_DETAIL_TABS)[number];
const ORGANIZATION_MEMBERSHIP_ROLE_OPTIONS: MembershipRole[] = [
  'OWNER',
  'MANAGER',
  'STAFF',
  'BOARD_MEMBER',
  'VOLUNTEER',
  'PASTOR',
  'OFFICIAL',
  'ADMINISTRATOR',
];
const ORGANIZATION_MEMBERSHIP_STATUS_OPTIONS: MembershipStatus[] = ['PENDING', 'ACTIVE', 'REJECTED', 'REMOVED'];
const ORGANIZATION_MEMBERSHIP_FILTER_OPTIONS = ['ACTIVE', 'PENDING', 'REJECTED', 'REMOVED', 'ALL'] as const;
type OrganizationMembershipFilter = (typeof ORGANIZATION_MEMBERSHIP_FILTER_OPTIONS)[number];

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

interface CommunityUserRecord {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
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
  community: {
    memberships: {
      user: CommunityUserRecord;
    }[];
  };
  events: OrganizationEventRecord[];
  forms: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    status: OrganizationFormStatus;
    isPubliclyListed: boolean;
    minimumTrustLevel: TrustLevelValue;
    opensAt: string | Date | null;
    closesAt: string | Date | null;
    publishedAt: string | Date | null;
    closedAt: string | Date | null;
    createdAt: string | Date;
    updatedAt: string | Date;
    _count: {
      questions: number;
      submissions: number;
    };
    questions: {
      id: string;
      prompt: string;
      helpText: string | null;
      type: OrganizationFormQuestionType;
      isRequired: boolean;
      sortOrder: number;
      options: {
        id: string;
        label: string;
        value: string;
        sortOrder: number;
      }[];
    }[];
  }[];
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

interface MembershipCreateFormState {
  userId: string;
  role: MembershipRole;
  status: MembershipStatus;
  title: string;
  isPublic: boolean;
  isPrimaryContact: boolean;
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

function buildMembershipCreateFormState(): MembershipCreateFormState {
  return {
    userId: '',
    role: 'MANAGER',
    status: 'ACTIVE',
    title: '',
    isPublic: false,
    isPrimaryContact: false,
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
  const [newMembershipForm, setNewMembershipForm] = useState<MembershipCreateFormState>(() => buildMembershipCreateFormState());
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [memberSearchValue, setMemberSearchValue] = useState('');
  const [membershipSearchValue, setMembershipSearchValue] = useState('');
  const [sectionError, setSectionError] = useState('');
  const [sectionSuccess, setSectionSuccess] = useState('');
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [editingRoleMembershipId, setEditingRoleMembershipId] = useState<string | null>(null);
  const [editingStatusMembershipId, setEditingStatusMembershipId] = useState<string | null>(null);
  const [membershipFilter, setMembershipFilter] = useState<OrganizationMembershipFilter>('ACTIVE');

  const activeMemberships = organization.memberships.filter((membership) => membership.status === 'ACTIVE');
  const organizationTypeOptions = ORGANIZATION_TYPE_OPTIONS[coreForm.directoryGroup];
  const availableCommunityUsers = organization.community.memberships.map((membership) => membership.user);
  const normalizedMemberSearch = memberSearchValue.trim().toLowerCase();
  const normalizedMembershipSearch = membershipSearchValue.trim().toLowerCase();
  const filteredAvailableCommunityUsers = availableCommunityUsers.filter((user) => {
    if (!normalizedMemberSearch) {
      return true;
    }

    return (
      user.firstName.toLowerCase().includes(normalizedMemberSearch) ||
      user.lastName.toLowerCase().includes(normalizedMemberSearch) ||
      user.email.toLowerCase().includes(normalizedMemberSearch)
    );
  });
  const membershipSearchMatches = organization.memberships.filter((membership) => {
    if (!normalizedMembershipSearch) {
      return true;
    }

    return (
      membership.user.firstName.toLowerCase().includes(normalizedMembershipSearch) ||
      membership.user.lastName.toLowerCase().includes(normalizedMembershipSearch) ||
      membership.user.email.toLowerCase().includes(normalizedMembershipSearch)
    );
  });
  const filteredMemberships = membershipSearchMatches.filter((membership) =>
    membershipFilter === 'ALL' ? true : membership.status === membershipFilter
  );

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

  async function saveMembership(
    membershipId: string,
    values: Pick<MembershipRecord, 'title' | 'isPublic' | 'isPrimaryContact'> & Partial<Pick<MembershipRecord, 'role' | 'status'>>
  ) {
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
      setEditingRoleMembershipId(null);
      setEditingStatusMembershipId(null);
      setFlashSuccess('Membership visibility updated.');
    } catch (error) {
      setFlashError(error instanceof Error ? error.message : 'Failed to update membership');
    } finally {
      setSavingKey(null);
    }
  }

  async function createMembership(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingKey('new-membership');
    setFlashError('');

    try {
      const response = await fetch(`/api/admin/organizations/${organization.id}/memberships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMembershipForm),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add member');
      }

      setOrganization((current) => ({
        ...current,
        memberships: [...current.memberships.map((membership) =>
          data.membership.isPrimaryContact ? { ...membership, isPrimaryContact: false } : membership
        ), data.membership],
        community: {
          ...current.community,
          memberships: current.community.memberships.filter((membership) => membership.user.id !== data.membership.user.id),
        },
      }));
      setNewMembershipForm(buildMembershipCreateFormState());
      setMemberSearchValue('');
      setShowAddMemberForm(false);
      setFlashSuccess('Member added.');
    } catch (error) {
      setFlashError(error instanceof Error ? error.message : 'Failed to add member');
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
                <CrudActionButton
                  type="submit"
                  variant="primary"
                  icon={Building2}
                  label={isSavingCore ? 'Saving organization profile' : 'Save Profile'}
                  disabled={isSavingCore}
                >
                  {isSavingCore ? 'Saving...' : 'Save Profile'}
                </CrudActionButton>
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
                    <TipTapEditor
                      content={coreForm.description}
                      onChange={(description) =>
                        setCoreForm((current) => ({
                          ...current,
                          description,
                        }))
                      }
                      placeholder="Describe the organization, what it does, and how it serves the community."
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
                <CrudActionButton
                  type="submit"
                  variant="primary"
                  icon={Plus}
                  label={savingKey === 'new-location' ? 'Adding location' : 'Add Location'}
                  disabled={savingKey === 'new-location'}
                >
                  {savingKey === 'new-location' ? 'Adding...' : 'Add Location'}
                </CrudActionButton>
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
                <CrudActionButton
                  type="submit"
                  variant="primary"
                  icon={Plus}
                  label={savingKey === 'new-department' ? 'Adding department' : 'Add Department'}
                  disabled={savingKey === 'new-department'}
                >
                  {savingKey === 'new-department' ? 'Adding...' : 'Add Department'}
                </CrudActionButton>
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
                <CrudActionButton
                  type="submit"
                  variant="primary"
                  icon={Plus}
                  label={savingKey === 'new-contact' ? 'Adding contact' : 'Add Contact'}
                  disabled={savingKey === 'new-contact'}
                >
                  {savingKey === 'new-contact' ? 'Adding...' : 'Add Contact'}
                </CrudActionButton>
              </form>
            </section>
          ) : null}

          {activeTab === 'members' ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-bold text-slate-950">Members</h2>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-slate-500">
                  {availableCommunityUsers.length} eligible same-community user{availableCommunityUsers.length === 1 ? '' : 's'} available
                </div>
                <CrudActionButton
                  type="button"
                  variant={showAddMemberForm ? 'secondary' : 'primary'}
                  icon={Plus}
                  label={showAddMemberForm ? 'Close add member' : 'Add member'}
                  onClick={() => {
                    setShowAddMemberForm((current) => !current);
                    if (showAddMemberForm) {
                      setMemberSearchValue('');
                      setNewMembershipForm(buildMembershipCreateFormState());
                    }
                  }}
                  disabled={availableCommunityUsers.length === 0}
                >
                  {showAddMemberForm ? 'Close' : 'Add Member'}
                </CrudActionButton>
              </div>

              {showAddMemberForm ? (
                availableCommunityUsers.length > 0 ? (
                  <form onSubmit={createMembership} className="mt-4 space-y-3 rounded-2xl border border-dashed border-slate-300 p-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="form-label text-slate-500">Search Users</label>
                        <input
                          value={memberSearchValue}
                          onChange={(event) => setMemberSearchValue(event.target.value)}
                          className="form-input"
                          placeholder="Search by name or email"
                        />
                      </div>
                      <div>
                        <label className="form-label text-slate-500">User</label>
                        <select
                          value={newMembershipForm.userId}
                          onChange={(event) =>
                            setNewMembershipForm((current) => ({
                              ...current,
                              userId: event.target.value,
                            }))
                          }
                          className="form-input"
                        >
                          <option value="">Select a community user</option>
                          {filteredAvailableCommunityUsers.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.firstName} {user.lastName} ({user.email})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="form-label text-slate-500">Role</label>
                        <select
                          value={newMembershipForm.role}
                          onChange={(event) =>
                            setNewMembershipForm((current) => ({
                              ...current,
                              role: event.target.value as MembershipRole,
                            }))
                          }
                          className="form-input"
                        >
                          {ORGANIZATION_MEMBERSHIP_ROLE_OPTIONS.map((role) => (
                            <option key={role} value={role}>
                              {formatOrganizationTypeLabel(role)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="form-label text-slate-500">Status</label>
                        <select
                          value={newMembershipForm.status}
                          onChange={(event) =>
                            setNewMembershipForm((current) => ({
                              ...current,
                              status: event.target.value as MembershipStatus,
                            }))
                          }
                          className="form-input"
                        >
                          {ORGANIZATION_MEMBERSHIP_STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {formatOrganizationTypeLabel(status)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="form-label text-slate-500">Public Title Override</label>
                        <input
                          value={newMembershipForm.title}
                          onChange={(event) =>
                            setNewMembershipForm((current) => ({
                              ...current,
                              title: event.target.value,
                            }))
                          }
                          className="form-input"
                          placeholder="Optional"
                        />
                      </div>
                      <div className="md:col-span-2 flex flex-wrap gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
                        <BooleanInput
                          checked={newMembershipForm.isPublic}
                          label="Show on roster"
                          onChange={(checked) =>
                            setNewMembershipForm((current) => ({
                              ...current,
                              isPublic: checked,
                            }))
                          }
                        />
                        <BooleanInput
                          checked={newMembershipForm.isPrimaryContact}
                          label="Primary contact"
                          onChange={(checked) =>
                            setNewMembershipForm((current) => ({
                              ...current,
                              isPrimaryContact: checked,
                            }))
                          }
                        />
                      </div>
                    </div>
                    {filteredAvailableCommunityUsers.length === 0 ? (
                      <div className="text-sm text-slate-500">No eligible users match the current search.</div>
                    ) : null}
                    <CrudActionButton
                      type="submit"
                      variant="primary"
                      icon={Plus}
                      label={savingKey === 'new-membership' ? 'Adding member' : 'Add member'}
                      disabled={savingKey === 'new-membership'}
                    >
                      {savingKey === 'new-membership' ? 'Adding...' : 'Add Member'}
                    </CrudActionButton>
                  </form>
                ) : (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-600">
                    No additional same-community users are available to attach to this organization.
                  </div>
                )
              ) : null}

              <div className="admin-list mt-4">
                <div className="admin-list-toolbar">
                  <label className="admin-list-filter">
                    <span className="admin-list-filter-label">Filter: Member Name</span>
                    <div className="relative">
                      <input
                        type="text"
                        value={membershipSearchValue}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          setMembershipSearchValue(nextValue);
                          if (nextValue.trim()) {
                            setMembershipFilter('ALL');
                          }
                        }}
                        placeholder="Search by first name, last name, or email"
                        className="admin-list-filter-input pr-10"
                      />
                      {membershipSearchValue ? (
                        <button
                          type="button"
                          onClick={() => {
                            setMembershipSearchValue('');
                            setMembershipFilter('ACTIVE');
                          }}
                          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-sm font-semibold text-slate-400 transition hover:text-slate-700"
                          aria-label="Clear member name filter"
                          title="Clear member name filter"
                        >
                          x
                        </button>
                      ) : null}
                    </div>
                  </label>
                  <label className="admin-list-filter">
                    <span className="admin-list-filter-label">Filter: Member Status</span>
                    <select
                      value={membershipFilter}
                      onChange={(event) => setMembershipFilter(event.target.value as OrganizationMembershipFilter)}
                      className="admin-list-cell-select min-w-[11rem]"
                    >
                      {ORGANIZATION_MEMBERSHIP_FILTER_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status === 'ALL' ? 'All' : formatOrganizationTypeLabel(status)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="admin-list-table-wrap">
                  <table className="admin-list-table">
                    <thead className="admin-list-head">
                      <tr>
                        <th className="admin-list-header-cell">Member</th>
                        <th className="admin-list-header-cell">Role</th>
                        <th className="admin-list-header-cell">Status</th>
                        <th className="admin-list-header-cell">Public Title</th>
                        <th className="admin-list-header-cell">Visibility</th>
                        <th className="admin-list-header-cell">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMemberships.length > 0 ? (
                        filteredMemberships.map((membership) => (
                          <MembershipEditor
                            key={membership.id}
                            membership={membership}
                            isSaving={savingKey === `membership-${membership.id}`}
                            isEditingRole={editingRoleMembershipId === membership.id}
                            isEditingStatus={editingStatusMembershipId === membership.id}
                            onEditRole={setEditingRoleMembershipId}
                            onEditStatus={setEditingStatusMembershipId}
                            onSave={saveMembership}
                          />
                        ))
                      ) : (
                        <tr>
                          <td className="admin-list-empty" colSpan={6}>
                            No {membershipFilter === 'ALL' ? '' : formatOrganizationTypeLabel(membershipFilter).toLowerCase() + ' '}members are visible in this filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
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

          {activeTab === 'forms' ? (
            <OrganizationFormsManager
              organizationId={organization.id}
              organizationSlug={organization.slug}
              forms={organization.forms}
            />
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
          <CrudActionButton type="submit" variant="secondary" icon={Save} label="Save location" disabled={isSaving}>
            Save
          </CrudActionButton>
          <CrudActionButton
            type="button"
            variant="danger"
            icon={Trash2}
            label="Delete location"
            disabled={isSaving}
            onClick={() => onDelete(location.id)}
          >
            Delete
          </CrudActionButton>
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
          <CrudActionButton type="submit" variant="secondary" icon={Save} label="Save department" disabled={isSaving}>
            Save
          </CrudActionButton>
          <CrudActionButton
            type="button"
            variant="danger"
            icon={Trash2}
            label="Delete department"
            disabled={isSaving}
            onClick={() => onDelete(department.id)}
          >
            Delete
          </CrudActionButton>
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
          <CrudActionButton type="submit" variant="secondary" icon={Save} label="Save contact" disabled={isSaving}>
            Save
          </CrudActionButton>
          <CrudActionButton
            type="button"
            variant="danger"
            icon={Trash2}
            label="Delete contact"
            disabled={isSaving}
            onClick={() => onDelete(contact.id)}
          >
            Delete
          </CrudActionButton>
        </div>
      </div>
      <ContactFields value={form} departments={departments} locations={locations} memberships={memberships} onChange={setForm} />
    </form>
  );
}

function MembershipEditor({
  membership,
  isSaving,
  isEditingRole,
  isEditingStatus,
  onEditRole,
  onEditStatus,
  onSave,
}: {
  membership: MembershipRecord;
  isSaving: boolean;
  isEditingRole: boolean;
  isEditingStatus: boolean;
  onEditRole: (membershipId: string | null) => void;
  onEditStatus: (membershipId: string | null) => void;
  onSave: (
    membershipId: string,
    values: Pick<MembershipRecord, 'title' | 'isPublic' | 'isPrimaryContact'> & Partial<Pick<MembershipRecord, 'role' | 'status'>>
  ) => Promise<void>;
}) {
  const [title, setTitle] = useState(membership.title || '');
  const [isPublic, setIsPublic] = useState(membership.isPublic);
  const [isPrimaryContact, setIsPrimaryContact] = useState(membership.isPrimaryContact);

  return (
    <tr className="admin-list-row">
      <td className="admin-list-cell">
        <span className="font-semibold text-slate-950">
          {membership.user.firstName} {membership.user.lastName}
        </span>
        <span className="text-slate-400"> · </span>
        <span className="text-slate-500">{membership.user.email}</span>
      </td>
      <td className="admin-list-cell">
        {isEditingRole ? (
          <select
            className="admin-list-cell-select"
            defaultValue={membership.role}
            disabled={isSaving}
            onBlur={() => {
              if (!isSaving) {
                onEditRole(null);
              }
            }}
            onChange={(event) =>
              onSave(membership.id, {
                title,
                isPublic,
                isPrimaryContact,
                role: event.target.value as MembershipRole,
              })
            }
            autoFocus
          >
            {ORGANIZATION_MEMBERSHIP_ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {formatOrganizationTypeLabel(role)}
              </option>
            ))}
          </select>
        ) : (
          <CrudActionButton
            type="button"
            variant="inline"
            icon={ListChecks}
            label="Change role"
            onClick={() => onEditRole(membership.id)}
          >
            {formatOrganizationTypeLabel(membership.role)}
          </CrudActionButton>
        )}
      </td>
      <td className="admin-list-cell">
        {isEditingStatus ? (
          <select
            className="admin-list-cell-select"
            defaultValue={membership.status}
            disabled={isSaving}
            onBlur={() => {
              if (!isSaving) {
                onEditStatus(null);
              }
            }}
            onChange={(event) =>
              onSave(membership.id, {
                title,
                isPublic,
                isPrimaryContact,
                status: event.target.value as MembershipStatus,
              })
            }
            autoFocus
          >
            {ORGANIZATION_MEMBERSHIP_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {formatOrganizationTypeLabel(status)}
              </option>
            ))}
          </select>
        ) : (
          <CrudActionButton
            type="button"
            variant="inline"
            icon={ListChecks}
            label="Change status"
            onClick={() => onEditStatus(membership.id)}
          >
            {formatOrganizationTypeLabel(membership.status)}
          </CrudActionButton>
        )}
      </td>
      <td className="admin-list-cell">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Public title override"
          className="form-input min-w-[220px] h-9 py-1"
        />
      </td>
      <td className="admin-list-cell">
        <div className="flex flex-wrap items-center gap-4 whitespace-nowrap">
          <BooleanInput checked={isPublic} label="Roster" onChange={setIsPublic} />
          <BooleanInput checked={isPrimaryContact} label="Primary" onChange={setIsPrimaryContact} />
        </div>
      </td>
      <td className="admin-list-cell">
        <CrudActionButton
          type="button"
          variant="secondary"
          icon={Save}
          label="Save membership"
          disabled={isSaving}
          onClick={() =>
            onSave(membership.id, {
              title,
              isPublic,
              isPrimaryContact,
            })
          }
        >
          Save
        </CrudActionButton>
      </td>
    </tr>
  );
}
