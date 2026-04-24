'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import InternalPageHeader from '@/components/shared/InternalPageHeader';
import {
  ORGANIZATION_GROUP_OPTIONS,
  ORGANIZATION_TYPE_OPTIONS,
  type OrganizationDirectoryGroup,
} from '@/lib/organization-taxonomy';
import { hasTrustedAccess } from '@/lib/trust-access';

type SubmitMode = 'create' | 'claim';

type OrganizationSearchResult = {
  id: string;
  name: string;
  slug: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  directoryGroup: 'BUSINESS' | 'GOVERNMENT' | 'ORGANIZATION';
  organizationType: string;
};

interface CreateOrganizationFormState {
  name: string;
  directoryGroup: OrganizationDirectoryGroup;
  organizationType: string;
  isOwnOrganization: boolean;
  description: string;
  websiteUrl: string;
  contactEmail: string;
  contactPhone: string;
}

const EMPTY_CREATE_FORM: CreateOrganizationFormState = {
  name: '',
  directoryGroup: 'ORGANIZATION',
  organizationType: ORGANIZATION_TYPE_OPTIONS.ORGANIZATION[0].value,
  isOwnOrganization: true,
  description: '',
  websiteUrl: '',
  contactEmail: '',
  contactPhone: '',
};

function formatTypeLabel(value: string) {
  return value
    .split('_')
    .map((segment) => segment.charAt(0) + segment.slice(1).toLowerCase())
    .join(' ');
}

export default function OrganizationsSubmitClient() {
  const { data: session, status } = useSession();
  const [mode, setMode] = useState<SubmitMode>('create');
  const [createForm, setCreateForm] = useState<CreateOrganizationFormState>(EMPTY_CREATE_FORM);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [claimQuery, setClaimQuery] = useState('');
  const [claimResults, setClaimResults] = useState<OrganizationSearchResult[]>([]);
  const [claimError, setClaimError] = useState('');
  const [claimSuccess, setClaimSuccess] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [claimingOrganizationId, setClaimingOrganizationId] = useState<string | null>(null);

  const isAuthenticated = status === 'authenticated' && Boolean(session?.user);
  const currentUser = session?.user as { trust_level?: string; role?: string } | undefined;
  const canSubmitOrganizations = hasTrustedAccess({
    trustLevel: currentUser?.trust_level,
    role: currentUser?.role,
  });

  useEffect(() => {
    if (!isAuthenticated || mode !== 'claim') {
      return;
    }

    const normalizedQuery = claimQuery.trim();

    if (normalizedQuery.length < 2) {
      setClaimResults([]);
      setClaimError('');
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setIsSearching(true);
      setClaimError('');

      try {
        const response = await fetch(`/api/organizations?query=${encodeURIComponent(normalizedQuery)}`, {
          signal: controller.signal,
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to search organizations');
        }

        setClaimResults((data.organizations || []).filter(
          (organization: OrganizationSearchResult) => organization.status === 'APPROVED'
        ));
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setClaimError(error instanceof Error ? error.message : 'Failed to search organizations');
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [claimQuery, isAuthenticated, mode]);

  const modeDescription = useMemo(() => {
    if (mode === 'create') {
      return 'Create a new organization listing for review. Approved listings appear in the directory and can grow into a fuller organization presence.';
    }

    return 'Search for an existing approved organization and request ownership or management access.';
  }, [mode]);

  function handleCreateInputChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = event.target;

    if (name === 'directoryGroup') {
      const nextGroup = value as OrganizationDirectoryGroup;
      setCreateForm((current) => ({
        ...current,
        directoryGroup: nextGroup,
        organizationType: ORGANIZATION_TYPE_OPTIONS[nextGroup][0].value,
      }));
      return;
    }

    setCreateForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleCreateOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError('');
    setCreateSuccess('');

    if (!createForm.name.trim()) {
      setCreateError('Organization name is required.');
      return;
    }

    setIsCreating(true);

    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...createForm,
          isOwnOrganization: createForm.isOwnOrganization,
          description: createForm.description.trim(),
          websiteUrl: createForm.websiteUrl.trim(),
          contactEmail: createForm.contactEmail.trim(),
          contactPhone: createForm.contactPhone.trim(),
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

      setCreateForm(EMPTY_CREATE_FORM);
      setCreateSuccess(
        data.membershipCreated
          ? `Submitted ${data.organization.name} for review and attached your account as the owner.`
          : `Submitted ${data.organization.name} for review without attaching your account as a member.`
      );
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Failed to create organization');
    } finally {
      setIsCreating(false);
    }
  }

  async function handleClaimOrganization(organization: OrganizationSearchResult) {
    setClaimError('');
    setClaimSuccess('');
    setClaimingOrganizationId(organization.id);

    try {
      const response = await fetch(`/api/organizations/${organization.id}/claim`, {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit claim request');
      }

      setClaimSuccess(`Submitted a claim request for ${organization.name}.`);
    } catch (error) {
      setClaimError(error instanceof Error ? error.message : 'Failed to submit claim request');
    } finally {
      setClaimingOrganizationId(null);
    }
  }

  if (status === 'loading') {
    return <p className="page-intro-copy py-10 text-center">Loading...</p>;
  }

  if (!isAuthenticated) {
    return (
      <div className="space-y-8">
        <InternalPageHeader title="Your Organization" />
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
          <h2 className="text-xl font-bold text-slate-950">Sign in to continue</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            You need an account to submit a new organization or request access to an existing one.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Sign In
            </Link>
            <Link
              href="/login?mode=sign-up"
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Create Account
            </Link>
          </div>
        </section>
      </div>
    );
  }

  if (!canSubmitOrganizations) {
    return (
      <div className="space-y-8">
        <InternalPageHeader title="Your Organization" />
        <section className="rounded-[28px] border border-amber-200 bg-amber-50 px-6 py-5 text-amber-900">
          Trusted membership is required to submit a new organization or request access to an existing one.
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <InternalPageHeader title="Your Organization" />

      <section className="rounded-[28px] border border-white/10 bg-white/82 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setMode('create')}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              mode === 'create' ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Add Organization
          </button>
          <button
            type="button"
            onClick={() => setMode('claim')}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              mode === 'claim' ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Claim Existing
          </button>
        </div>

        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">{modeDescription}</p>
      </section>

      {mode === 'create' ? (
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
          <h2 className="text-xl font-bold text-slate-950">Add organization</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            New organizations enter review first. If approved, they appear in the public directory and can be managed further later.
          </p>

          {createError ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {createError}
            </div>
          ) : null}

          {createSuccess ? (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {createSuccess}
            </div>
          ) : null}

          <form onSubmit={handleCreateOrganization} className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="lg:col-span-2">
              <label className="form-label text-slate-500">Organization Name</label>
              <input
                type="text"
                name="name"
                value={createForm.name}
                onChange={handleCreateInputChange}
                className="form-input border-slate-300 bg-white text-slate-950"
                maxLength={160}
                required
              />
            </div>

            <div>
              <label className="form-label text-slate-500">Directory Group</label>
              <select
                name="directoryGroup"
                value={createForm.directoryGroup}
                onChange={handleCreateInputChange}
                className="form-input border-slate-300 bg-white text-slate-950"
              >
                {ORGANIZATION_GROUP_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label text-slate-500">Organization Type</label>
              <select
                name="organizationType"
                value={createForm.organizationType}
                onChange={handleCreateInputChange}
                className="form-input border-slate-300 bg-white text-slate-950"
              >
                {ORGANIZATION_TYPE_OPTIONS[createForm.directoryGroup].map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-2">
              <label className="form-label text-slate-500">Description</label>
              <textarea
                name="description"
                value={createForm.description}
                onChange={handleCreateInputChange}
                className="form-input min-h-[140px] border-slate-300 bg-white text-slate-950"
                maxLength={4000}
              />
            </div>

            <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-sm font-semibold text-slate-950">Is this your organization?</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                If yes, your account will be attached as the owner for this listing. If no, you can still submit it for the directory without becoming a member.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <label className="flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700">
                  <input
                    type="radio"
                    name="isOwnOrganization"
                    checked={createForm.isOwnOrganization}
                    onChange={() =>
                      setCreateForm((current) => ({ ...current, isOwnOrganization: true }))
                    }
                  />
                  <span>Yes, it is mine</span>
                </label>
                <label className="flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700">
                  <input
                    type="radio"
                    name="isOwnOrganization"
                    checked={!createForm.isOwnOrganization}
                    onChange={() =>
                      setCreateForm((current) => ({ ...current, isOwnOrganization: false }))
                    }
                  />
                  <span>No, just add it</span>
                </label>
              </div>
            </div>

            <div>
              <label className="form-label text-slate-500">Website</label>
              <input
                type="url"
                name="websiteUrl"
                value={createForm.websiteUrl}
                onChange={handleCreateInputChange}
                className="form-input border-slate-300 bg-white text-slate-950"
              />
            </div>

            <div>
              <label className="form-label text-slate-500">Contact Email</label>
              <input
                type="email"
                name="contactEmail"
                value={createForm.contactEmail}
                onChange={handleCreateInputChange}
                className="form-input border-slate-300 bg-white text-slate-950"
              />
            </div>

            <div>
              <label className="form-label text-slate-500">Contact Phone</label>
              <input
                type="tel"
                name="contactPhone"
                value={createForm.contactPhone}
                onChange={handleCreateInputChange}
                className="form-input border-slate-300 bg-white text-slate-950"
              />
            </div>

            <div className="lg:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={isCreating}
                className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreating ? 'Submitting...' : 'Submit Organization'}
              </button>
            </div>
          </form>
        </section>
      ) : (
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
          <h2 className="text-xl font-bold text-slate-950">Claim existing organization</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Search approved organizations already in the directory. If you represent one, submit a claim request for review.
          </p>

          {claimError ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {claimError}
            </div>
          ) : null}

          {claimSuccess ? (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {claimSuccess}
            </div>
          ) : null}

          <div className="mt-5">
            <label className="form-label text-slate-500">Search organizations</label>
            <input
              type="search"
              value={claimQuery}
              onChange={(event) => setClaimQuery(event.target.value)}
              placeholder="Search by organization name"
              className="form-input border-slate-300 bg-white text-slate-950"
            />
          </div>

          <div className="mt-5 space-y-3">
            {isSearching ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                Searching organizations...
              </div>
            ) : claimQuery.trim().length < 2 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                Enter at least two characters to search approved organizations.
              </div>
            ) : claimResults.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                No approved organizations matched that search.
              </div>
            ) : (
              claimResults.map((organization) => (
                <div
                  key={organization.id}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/organizations/${organization.slug}`}
                      className="text-base font-semibold text-slate-950 hover:text-[color:var(--brand-accent)]"
                    >
                      {organization.name}
                    </Link>
                    <p className="mt-1 text-sm text-slate-500">
                      {organization.directoryGroup === 'BUSINESS'
                        ? 'Business'
                        : organization.directoryGroup === 'GOVERNMENT'
                          ? 'Government'
                          : 'Organization'}
                      {' • '}
                      {formatTypeLabel(organization.organizationType)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleClaimOrganization(organization)}
                    disabled={claimingOrganizationId === organization.id}
                    className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {claimingOrganizationId === organization.id ? 'Submitting...' : 'Request Claim'}
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
}
