'use client';

import { FormEvent, useState } from 'react';
import ImageUpload from '@/components/shared/ImageUpload';
import StatusMessage from '@/components/shared/StatusMessage';
import { formatPhoneInput } from '@/lib/organization-admin';
import {
  ORGANIZATION_GROUP_OPTIONS,
  ORGANIZATION_TYPE_OPTIONS,
  type OrganizationDirectoryGroup,
} from '@/lib/organization-taxonomy';

interface WorkspaceOrganizationProfileEditorProps {
  organization: {
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
    isPublicMemberRoster: boolean;
    status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  };
  profileUserId: string;
}

interface FormState {
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

function buildFormState(organization: WorkspaceOrganizationProfileEditorProps['organization']): FormState {
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

export default function WorkspaceOrganizationProfileEditor({
  organization: initialOrganization,
  profileUserId,
}: WorkspaceOrganizationProfileEditorProps) {
  const [organization, setOrganization] = useState(initialOrganization);
  const [form, setForm] = useState<FormState>(() => buildFormState(initialOrganization));
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const typeOptions = ORGANIZATION_TYPE_OPTIONS[form.directoryGroup];

  function handleInputChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = event.target;

    if (name === 'directoryGroup') {
      const nextGroup = value as OrganizationDirectoryGroup;
      setForm((current) => ({
        ...current,
        directoryGroup: nextGroup,
        organizationType: ORGANIZATION_TYPE_OPTIONS[nextGroup][0].value,
      }));
      return;
    }

    if (name === 'contactPhone') {
      setForm((current) => ({
        ...current,
        contactPhone: formatPhoneInput(value),
      }));
      return;
    }

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleCheckboxChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { name, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: checked,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await fetch(
        `/api/profile/${profileUserId}/workspace/organizations/${organization.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(form),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        const validationMessage = Array.isArray(data.details)
          ? data.details.map((detail: { message?: string }) => detail.message).filter(Boolean).join(', ')
          : '';
        throw new Error(validationMessage || data.error || 'Failed to update organization');
      }

      setOrganization(data.organization);
      setForm(buildFormState(data.organization));
      setSuccess('Organization profile updated.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to update organization');
    }
  }

  return (
    <form id="organization-profile-form" onSubmit={handleSubmit} className="space-y-5">
      {error ? (
        <StatusMessage variant="error" title="Organization update failed">
          <p>{error}</p>
        </StatusMessage>
      ) : null}

      {success ? (
        <StatusMessage variant="success" title="Organization updated">
          <p>{success}</p>
        </StatusMessage>
      ) : null}

      <section className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
        <div className="border-b border-slate-200 px-6 py-5">
          <p className="text-[12px] font-semibold uppercase tracking-[0.28em] text-[var(--brand-accent)]">Public Profile</p>
          <h2 className="mt-2 text-[2rem] font-semibold tracking-[-0.03em] text-slate-800">Organization details</h2>
          <p className="text-sm text-slate-600">
            This information appears on your public organization page and in the community directory.
          </p>
        </div>
        <div className="grid gap-5 px-6 py-5 xl:grid-cols-[minmax(0,1fr)_332px]">
          <div className="space-y-4">
            <fieldset className="space-y-4 rounded-2xl border border-slate-200 p-4">
              <legend className="px-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Identity</legend>
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <label className="form-label text-slate-500">Organization name *</label>
                  <input name="name" value={form.name} onChange={handleInputChange} className="form-input" />
                </div>
                <div>
                  <label className="form-label text-slate-500">Slug</label>
                  <div className="form-input bg-slate-50 text-slate-500">{organization.slug}</div>
                </div>
                <div>
                  <label className="form-label text-slate-500">Type *</label>
                  <select name="organizationType" value={form.organizationType} onChange={handleInputChange} className="form-input">
                    {typeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label text-slate-500">Directory group *</label>
                  <select name="directoryGroup" value={form.directoryGroup} onChange={handleInputChange} className="form-input">
                    {ORGANIZATION_GROUP_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="lg:col-span-2">
                  <label className="form-label text-slate-500">Short description</label>
                  <div className="space-y-2">
                    <div className="flex justify-end text-xs text-slate-400">
                      {form.description.length} / 240
                    </div>
                    <textarea
                      value={form.description}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          description: event.target.value.slice(0, 240),
                        }))
                      }
                      className="form-input min-h-[112px] resize-y"
                      placeholder="Resident-led association serving the neighborhood through advocacy, events, and civic work."
                    />
                    <p className="text-xs text-slate-400">
                      Plain text. Shown beneath your organization name in search results.
                    </p>
                  </div>
                </div>
              </div>
            </fieldset>

            <fieldset className="space-y-4 rounded-2xl border border-slate-200 p-4">
              <legend className="px-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Contact</legend>
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <label className="form-label text-slate-500">Public email</label>
                  <input name="contactEmail" value={form.contactEmail} onChange={handleInputChange} className="form-input" />
                </div>
                <div>
                  <label className="form-label text-slate-500">Phone</label>
                  <input name="contactPhone" value={form.contactPhone} onChange={handleInputChange} className="form-input" />
                </div>
                <div className="lg:col-span-2">
                  <label className="form-label text-slate-500">Website</label>
                  <div className="flex overflow-hidden rounded-xl border border-[var(--input-border)] bg-white focus-within:ring-4 focus-within:ring-[var(--input-focus-ring)]">
                    <div className="flex items-center border-r border-slate-200 bg-slate-50 px-4 text-sm text-slate-400">
                      https://
                    </div>
                    <input
                      name="websiteUrl"
                      value={form.websiteUrl.replace(/^https?:\/\//, '')}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          websiteUrl: event.target.value ? `https://${event.target.value.replace(/^https?:\/\//, '')}` : '',
                        }))
                      }
                      className="min-h-[3rem] flex-1 border-0 bg-transparent px-4 py-3 text-base text-slate-800 outline-none"
                    />
                  </div>
                </div>
              </div>
            </fieldset>

            <fieldset className="space-y-4 rounded-2xl border border-slate-200 p-4">
              <legend className="px-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Visibility</legend>
              <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3">
                <div>
                  <div className="text-base font-medium text-slate-800">Publish public page</div>
                  <p className="text-sm text-slate-500">
                    When off, the organization is hidden from the directory and search.
                  </p>
                </div>
                <input
                  id="isPublicMemberRoster"
                  type="checkbox"
                  name="isPublicMemberRoster"
                  checked={form.isPublicMemberRoster}
                  onChange={handleCheckboxChange}
                  className="mt-1 h-7 w-12 rounded-full border-slate-300 text-[var(--brand-primary)] focus:ring-[var(--input-focus-ring)]"
                />
              </div>
            </fieldset>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Logo</div>
              <ImageUpload
                context="organization"
                maxFiles={1}
                singleCard
                value={form.logoUrl ? [form.logoUrl] : []}
                onUpload={(image) =>
                  setForm((current) => ({
                    ...current,
                    logoUrl: image.url,
                  }))
                }
                onRemove={() =>
                  setForm((current) => ({
                    ...current,
                    logoUrl: '',
                  }))
                }
                label="Replace logo"
                labelClassName="sr-only"
                helperText="PNG or SVG · square · max 2 MB"
              />
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Banner</div>
              <ImageUpload
                context="organization"
                maxFiles={1}
                singleCard
                value={form.bannerUrl ? [form.bannerUrl] : []}
                onUpload={(image) =>
                  setForm((current) => ({
                    ...current,
                    bannerUrl: image.url,
                  }))
                }
                onRemove={() =>
                  setForm((current) => ({
                    ...current,
                    bannerUrl: '',
                  }))
                }
                label="Upload banner"
                labelClassName="sr-only"
                helperText="JPG or PNG · 4:1 · max 5 MB"
              />
            </div>
          </div>
        </div>
      </section>
    </form>
  );
}
