'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Globe, Plus, Trash2 } from 'lucide-react';
import { CrudActionButton } from '@/components/shared/CrudAction';

const SITE_DETAIL_TABS = ['details', 'domains', 'provisioning'] as const;
type SiteDetailTab = (typeof SITE_DETAIL_TABS)[number];
type DomainStatus = 'PENDING' | 'ACTIVE' | 'DISABLED';
type LaunchStatus = 'PRELAUNCH' | 'LIVE' | 'PAUSED';
type CoverageType = 'PRIMARY' | 'SECONDARY' | 'EMERGING' | 'WATCHLIST';
const COVERAGE_TYPES = ['PRIMARY', 'SECONDARY', 'EMERGING', 'WATCHLIST'] as const;

interface DomainRecord {
  id: string;
  domain: string;
  isPrimary: boolean;
  status: DomainStatus;
}

interface SiteDetailRecord {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  description: string | null;
  createdAt: string | Date;
  provisioning: {
    launchStatus: string;
    themeManifestSlug: string;
    provisioningNotes: string;
  };
  coverageAreas: Array<{
    id: string;
    coverageType: CoverageType;
    isPrimary: boolean;
    isActive: boolean;
    place: {
      id: string;
      displayName: string;
      type: string;
    };
  }>;
  domains: DomainRecord[];
}

interface SiteDetailEditorProps {
  site: SiteDetailRecord;
  availableThemeManifestSlugs: string[];
}

interface SiteCoreFormState {
  name: string;
  slug: string;
  description: string;
}

interface SiteProvisioningFormState {
  launchStatus: LaunchStatus;
  themeManifestSlug: string;
  provisioningNotes: string;
}

interface DomainCreateFormState {
  domain: string;
  status: DomainStatus;
  isPrimary: boolean;
}

interface PlaceOption {
  id: string;
  displayName: string;
  slug: string;
  type: string;
  admin2Name: string | null;
}

interface CoverageCreateFormState {
  placeId: string;
  coverageType: CoverageType;
  isPrimary: boolean;
}

function buildCoreFormState(site: SiteDetailRecord): SiteCoreFormState {
  return {
    name: site.name,
    slug: site.slug,
    description: site.description || '',
  };
}

function buildDomainCreateFormState(): DomainCreateFormState {
  return {
    domain: '',
    status: 'PENDING',
    isPrimary: false,
  };
}

function buildProvisioningFormState(site: SiteDetailRecord): SiteProvisioningFormState {
  return {
    launchStatus: (site.provisioning.launchStatus || 'PRELAUNCH') as LaunchStatus,
    themeManifestSlug: site.provisioning.themeManifestSlug || '',
    provisioningNotes: site.provisioning.provisioningNotes || '',
  };
}

function buildCoverageCreateFormState(): CoverageCreateFormState {
  return {
    placeId: '',
    coverageType: 'SECONDARY',
    isPrimary: false,
  };
}

function formatTabLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getDomainStatusLabel(status: DomainStatus) {
  switch (status) {
    case 'ACTIVE':
      return 'Active';
    case 'DISABLED':
      return 'Disabled';
    default:
      return 'Pending';
  }
}

export default function SiteDetailEditor({
  site: initialSite,
  availableThemeManifestSlugs,
}: SiteDetailEditorProps) {
  const [site, setSite] = useState(initialSite);
  const [activeTab, setActiveTab] = useState<SiteDetailTab>('details');
  const [coreForm, setCoreForm] = useState<SiteCoreFormState>(() => buildCoreFormState(initialSite));
  const [coreError, setCoreError] = useState('');
  const [coreSuccess, setCoreSuccess] = useState('');
  const [isSavingCore, setIsSavingCore] = useState(false);
  const [provisioningForm, setProvisioningForm] = useState<SiteProvisioningFormState>(() =>
    buildProvisioningFormState(initialSite)
  );
  const [provisioningError, setProvisioningError] = useState('');
  const [provisioningSuccess, setProvisioningSuccess] = useState('');
  const [isSavingProvisioning, setIsSavingProvisioning] = useState(false);
  const [domainForm, setDomainForm] = useState<DomainCreateFormState>(() => buildDomainCreateFormState());
  const [domainError, setDomainError] = useState('');
  const [domainSuccess, setDomainSuccess] = useState('');
  const [isSavingDomain, setIsSavingDomain] = useState(false);
  const [savingDomainId, setSavingDomainId] = useState<string | null>(null);
  const [coverageForm, setCoverageForm] = useState<CoverageCreateFormState>(() => buildCoverageCreateFormState());
  const [coverageError, setCoverageError] = useState('');
  const [coverageSuccess, setCoverageSuccess] = useState('');
  const [isSavingCoverage, setIsSavingCoverage] = useState(false);
  const [savingCoverageId, setSavingCoverageId] = useState<string | null>(null);
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState<PlaceOption[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceOption | null>(null);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);

  const primaryDomain = useMemo(
    () => site.domains.find((domain) => domain.isPrimary) ?? null,
    [site.domains]
  );
  const normalizedThemeManifestSlug = provisioningForm.themeManifestSlug.trim();
  const themeManifestExists =
    !normalizedThemeManifestSlug || availableThemeManifestSlugs.includes(normalizedThemeManifestSlug);

  useEffect(() => {
    if (!placeQuery.trim()) {
      setPlaceResults([]);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        setIsLoadingPlaces(true);
        const res = await fetch(`/api/places?query=${encodeURIComponent(placeQuery.trim())}&limit=10`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          return;
        }

        const data = await res.json();
        setPlaceResults(data.places || []);
      } catch {
        if (!controller.signal.aborted) {
          setPlaceResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingPlaces(false);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [placeQuery]);

  function updateSite(nextSite: SiteDetailRecord) {
    setSite(nextSite);
    setCoreForm(buildCoreFormState(nextSite));
    setProvisioningForm(buildProvisioningFormState(nextSite));
  }

  function setDomainFlashError(message: string) {
    setDomainSuccess('');
    setDomainError(message);
  }

  function setDomainFlashSuccess(message: string) {
    setDomainError('');
    setDomainSuccess(message);
  }

  function setCoverageFlashError(message: string) {
    setCoverageSuccess('');
    setCoverageError(message);
  }

  function setCoverageFlashSuccess(message: string) {
    setCoverageError('');
    setCoverageSuccess(message);
  }

  function normalizeCoverageArea(coverageArea: {
    id: string;
    coverageType: CoverageType;
    isPrimary: boolean;
    isActive: boolean;
    place: {
      id: string;
      displayName: string;
      type: string;
    };
  }) {
    return {
      id: coverageArea.id,
      coverageType: coverageArea.coverageType,
      isPrimary: coverageArea.isPrimary,
      isActive: coverageArea.isActive,
      place: {
        id: coverageArea.place.id,
        displayName: coverageArea.place.displayName,
        type: coverageArea.place.type,
      },
    };
  }

  async function handleSaveCore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCoreError('');
    setCoreSuccess('');
    setIsSavingCore(true);

    try {
      const response = await fetch(`/api/admin/sites/${site.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(coreForm),
      });

      const data = await response.json();

      if (!response.ok) {
        const validationMessage = Array.isArray(data.details)
          ? data.details
              .map((detail: { message?: string }) => detail.message)
              .filter(Boolean)
              .join(', ')
          : '';
        throw new Error(validationMessage || data.error || 'Failed to update site');
      }

      updateSite(data.site);
      setCoreSuccess('Site details saved.');
    } catch (error) {
      setCoreError(error instanceof Error ? error.message : 'Failed to update site');
    } finally {
      setIsSavingCore(false);
    }
  }

  async function handleSaveProvisioning(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProvisioningError('');
    setProvisioningSuccess('');
    setIsSavingProvisioning(true);

    try {
      const response = await fetch(`/api/admin/sites/${site.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...coreForm,
          ...provisioningForm,
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
        throw new Error(validationMessage || data.error || 'Failed to update provisioning');
      }

      updateSite(data.site);
      setProvisioningSuccess('Provisioning settings saved.');
    } catch (error) {
      setProvisioningError(error instanceof Error ? error.message : 'Failed to update provisioning');
    } finally {
      setIsSavingProvisioning(false);
    }
  }

  async function handleCreateDomain(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDomainFlashError('');
    setDomainFlashSuccess('');
    setIsSavingDomain(true);

    try {
      const response = await fetch(`/api/admin/sites/${site.id}/domains`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(domainForm),
      });

      const data = await response.json();

      if (!response.ok) {
        const validationMessage = Array.isArray(data.details)
          ? data.details
              .map((detail: { message?: string }) => detail.message)
              .filter(Boolean)
              .join(', ')
          : '';
        throw new Error(validationMessage || data.error || 'Failed to add domain');
      }

      updateSite(data.site);
      setDomainForm(buildDomainCreateFormState());
      setDomainFlashSuccess('Domain added.');
    } catch (error) {
      setDomainFlashError(error instanceof Error ? error.message : 'Failed to add domain');
    } finally {
      setIsSavingDomain(false);
    }
  }

  async function handleDomainStatusChange(domainId: string, status: DomainStatus) {
    setSavingDomainId(domainId);
    setDomainFlashError('');
    setDomainFlashSuccess('');

    try {
      const response = await fetch(`/api/admin/sites/${site.id}/domains/${domainId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update domain status');
      }

      updateSite(data.site);
      setDomainFlashSuccess('Domain status updated.');
    } catch (error) {
      setDomainFlashError(error instanceof Error ? error.message : 'Failed to update domain status');
    } finally {
      setSavingDomainId(null);
    }
  }

  async function handleMakePrimary(domainId: string) {
    setSavingDomainId(domainId);
    setDomainFlashError('');
    setDomainFlashSuccess('');

    try {
      const response = await fetch(`/api/admin/sites/${site.id}/domains/${domainId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isPrimary: true }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to promote domain');
      }

      updateSite(data.site);
      setDomainFlashSuccess('Primary domain updated.');
    } catch (error) {
      setDomainFlashError(error instanceof Error ? error.message : 'Failed to promote domain');
    } finally {
      setSavingDomainId(null);
    }
  }

  async function handleDeleteDomain(domainId: string) {
    setSavingDomainId(domainId);
    setDomainFlashError('');
    setDomainFlashSuccess('');

    try {
      const response = await fetch(`/api/admin/sites/${site.id}/domains/${domainId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete domain');
      }

      updateSite(data.site);
      setDomainFlashSuccess('Domain deleted.');
    } catch (error) {
      setDomainFlashError(error instanceof Error ? error.message : 'Failed to delete domain');
    } finally {
      setSavingDomainId(null);
    }
  }

  async function handleCreateCoverage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedPlace) {
      setCoverageFlashError('Choose a place first.');
      return;
    }

    setIsSavingCoverage(true);
    setCoverageFlashError('');
    setCoverageFlashSuccess('');

    try {
      const response = await fetch('/api/admin/tenant-coverage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          communityId: site.id,
          placeId: selectedPlace.id,
          coverageType: coverageForm.coverageType,
          isPrimary: coverageForm.isPrimary,
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
        throw new Error(validationMessage || data.error || 'Failed to add coverage area');
      }

      const nextCoverageArea = normalizeCoverageArea(data.coverageArea);
      setSite((current) => ({
        ...current,
        coverageAreas: [
          ...current.coverageAreas
            .filter((entry) => !(nextCoverageArea.isPrimary && entry.isPrimary))
            .filter((entry) => entry.id !== nextCoverageArea.id),
          nextCoverageArea,
        ].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.place.displayName.localeCompare(b.place.displayName)),
      }));
      setCoverageForm(buildCoverageCreateFormState());
      setSelectedPlace(null);
      setPlaceQuery('');
      setPlaceResults([]);
      setCoverageFlashSuccess('Coverage area added.');
    } catch (error) {
      setCoverageFlashError(error instanceof Error ? error.message : 'Failed to add coverage area');
    } finally {
      setIsSavingCoverage(false);
    }
  }

  async function handleCoverageTypeChange(coverageId: string, coverageType: CoverageType) {
    setSavingCoverageId(coverageId);
    setCoverageFlashError('');
    setCoverageFlashSuccess('');

    try {
      const response = await fetch(`/api/admin/tenant-coverage/${coverageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ coverageType }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update coverage type');
      }

      const nextCoverageArea = normalizeCoverageArea(data.coverageArea);
      setSite((current) => ({
        ...current,
        coverageAreas: current.coverageAreas
          .map((entry) => (entry.id === coverageId ? nextCoverageArea : entry))
          .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.place.displayName.localeCompare(b.place.displayName)),
      }));
      setCoverageFlashSuccess('Coverage updated.');
    } catch (error) {
      setCoverageFlashError(error instanceof Error ? error.message : 'Failed to update coverage');
    } finally {
      setSavingCoverageId(null);
    }
  }

  async function handleCoveragePrimaryChange(coverageId: string) {
    setSavingCoverageId(coverageId);
    setCoverageFlashError('');
    setCoverageFlashSuccess('');

    try {
      const response = await fetch(`/api/admin/tenant-coverage/${coverageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isPrimary: true }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to promote coverage area');
      }

      const nextCoverageArea = normalizeCoverageArea(data.coverageArea);
      setSite((current) => ({
        ...current,
        coverageAreas: current.coverageAreas
          .map((entry) =>
            entry.id === coverageId
              ? nextCoverageArea
              : {
                  ...entry,
                  isPrimary: false,
                }
          )
          .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.place.displayName.localeCompare(b.place.displayName)),
      }));
      setCoverageFlashSuccess('Primary coverage updated.');
    } catch (error) {
      setCoverageFlashError(error instanceof Error ? error.message : 'Failed to promote coverage area');
    } finally {
      setSavingCoverageId(null);
    }
  }

  async function handleCoverageActiveToggle(coverageId: string, nextIsActive: boolean) {
    setSavingCoverageId(coverageId);
    setCoverageFlashError('');
    setCoverageFlashSuccess('');

    try {
      const response = await fetch(`/api/admin/tenant-coverage/${coverageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: nextIsActive }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update coverage activity');
      }

      const nextCoverageArea = normalizeCoverageArea(data.coverageArea);
      setSite((current) => ({
        ...current,
        coverageAreas: nextIsActive
          ? current.coverageAreas
              .filter((entry) => entry.id !== coverageId)
              .concat(nextCoverageArea)
              .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.place.displayName.localeCompare(b.place.displayName))
          : current.coverageAreas.filter((entry) => entry.id !== coverageId),
      }));
      setCoverageFlashSuccess(nextIsActive ? 'Coverage area activated.' : 'Coverage area removed from active summary.');
    } catch (error) {
      setCoverageFlashError(error instanceof Error ? error.message : 'Failed to update coverage activity');
    } finally {
      setSavingCoverageId(null);
    }
  }

  async function handleDeleteCoverage(coverageId: string) {
    setSavingCoverageId(coverageId);
    setCoverageFlashError('');
    setCoverageFlashSuccess('');

    try {
      const response = await fetch(`/api/admin/tenant-coverage/${coverageId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete coverage area');
      }

      setSite((current) => ({
        ...current,
        coverageAreas: current.coverageAreas.filter((entry) => entry.id !== coverageId),
      }));
      setCoverageFlashSuccess('Coverage area deleted.');
    } catch (error) {
      setCoverageFlashError(error instanceof Error ? error.message : 'Failed to delete coverage area');
    } finally {
      setSavingCoverageId(null);
    }
  }

  return (
    <div className="space-y-0">
      <div className="mb-3">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Site</div>
        <div className="mt-1 text-2xl font-bold text-slate-950">{site.name}</div>
        <div className="mt-1 text-sm text-slate-500">
          Created {formatDate(site.createdAt)}
          {primaryDomain ? ` · Primary domain: ${primaryDomain.domain}` : ' · No primary domain set'}
        </div>
      </div>

      <div className="relative top-[2px] flex flex-wrap gap-0 pb-0">
        {SITE_DETAIL_TABS.map((tab) => {
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
          <form onSubmit={handleSaveCore} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
            <div>
              <h3 className="text-lg font-bold text-slate-950">Site Details</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Update the core tenant identity record. Theme manifests still remain code-owned, but these values
                define the canonical site record and tenant slug used across the system.
              </p>
            </div>

            {coreError ? <div className="admin-list-error">{coreError}</div> : null}
            {coreSuccess ? (
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-700">
                {coreSuccess}
              </div>
            ) : null}

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <label className="form-label text-slate-500">Site Name</label>
                  <input
                    type="text"
                    name="name"
                    value={coreForm.name}
                    onChange={(event) =>
                      setCoreForm((current) => ({ ...current, name: event.target.value }))
                    }
                    className="form-input border-slate-300 bg-white text-slate-950"
                  />
                </div>

                <div>
                  <label className="form-label text-slate-500">Slug</label>
                  <input
                    type="text"
                    name="slug"
                    value={coreForm.slug}
                    onChange={(event) =>
                      setCoreForm((current) => ({ ...current, slug: event.target.value }))
                    }
                    className="form-input border-slate-300 bg-white text-slate-950"
                  />
                </div>

                <div className="lg:col-span-2">
                  <label className="form-label text-slate-500">Description</label>
                  <textarea
                    name="description"
                    value={coreForm.description}
                    onChange={(event) =>
                      setCoreForm((current) => ({ ...current, description: event.target.value }))
                    }
                    className="form-textarea border-slate-300 bg-white text-slate-950"
                    rows={4}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button type="submit" disabled={isSavingCore} className="btn-primary">
                {isSavingCore ? 'Saving...' : 'Save Details'}
              </button>
            </div>
          </form>
        ) : activeTab === 'domains' ? (
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-lg font-bold text-slate-950">Add Domain</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Add live, pending, or disabled domains for this site. Setting a domain as primary also updates
                the site’s canonical legacy domain field used by existing tenant resolution paths.
              </p>

              {domainError ? <div className="admin-list-error mt-4">{domainError}</div> : null}
              {domainSuccess ? (
                <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-700">
                  {domainSuccess}
                </div>
              ) : null}

              <form onSubmit={handleCreateDomain} className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_auto]">
                <div>
                  <label className="form-label text-slate-500">Domain</label>
                  <input
                    type="text"
                    value={domainForm.domain}
                    onChange={(event) =>
                      setDomainForm((current) => ({ ...current, domain: event.target.value }))
                    }
                    className="form-input border-slate-300 bg-white text-slate-950"
                    placeholder="example.org"
                  />
                </div>
                <div>
                  <label className="form-label text-slate-500">Status</label>
                  <select
                    value={domainForm.status}
                    onChange={(event) =>
                      setDomainForm((current) => ({
                        ...current,
                        status: event.target.value as DomainStatus,
                      }))
                    }
                    className="form-input border-slate-300 bg-white text-slate-950"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="ACTIVE">Active</option>
                    <option value="DISABLED">Disabled</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={domainForm.isPrimary}
                      onChange={(event) =>
                        setDomainForm((current) => ({ ...current, isPrimary: event.target.checked }))
                      }
                    />
                    Primary
                  </label>
                </div>
                <div className="lg:col-span-3 flex justify-end">
                  <button type="submit" disabled={isSavingDomain} className="btn-primary">
                    {isSavingDomain ? 'Adding...' : 'Add Domain'}
                  </button>
                </div>
              </form>
            </div>

            <div className="admin-list-table-wrap">
              <table className="admin-list-table">
                <thead className="admin-list-head">
                  <tr>
                    <th className="admin-list-header-cell">Domain</th>
                    <th className="admin-list-header-cell">Primary</th>
                    <th className="admin-list-header-cell">Status</th>
                    <th className="admin-list-header-cell">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {site.domains.length > 0 ? (
                    site.domains.map((domain) => (
                      <tr key={domain.id} className="admin-list-row">
                        <td className="admin-list-cell">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-slate-500" />
                            <span className="font-medium text-slate-900">{domain.domain}</span>
                          </div>
                        </td>
                        <td className="admin-list-cell">
                          {domain.isPrimary ? 'Yes' : 'No'}
                        </td>
                        <td className="admin-list-cell">
                          <select
                            className="admin-list-cell-select"
                            value={domain.status}
                            disabled={savingDomainId === domain.id}
                            onChange={(event) =>
                              handleDomainStatusChange(domain.id, event.target.value as DomainStatus)
                            }
                          >
                            <option value="PENDING">Pending</option>
                            <option value="ACTIVE">Active</option>
                            <option value="DISABLED">Disabled</option>
                          </select>
                        </td>
                        <td className="admin-list-cell">
                          <div className="flex flex-wrap gap-3">
                            {!domain.isPrimary ? (
                              <CrudActionButton
                                type="button"
                                variant="inline"
                                icon={Plus}
                                label="Make primary"
                                onClick={() => handleMakePrimary(domain.id)}
                                disabled={savingDomainId === domain.id}
                              >
                                Make primary
                              </CrudActionButton>
                            ) : (
                              <span className="text-xs font-semibold text-slate-500">
                                {getDomainStatusLabel(domain.status)}
                              </span>
                            )}
                            <CrudActionButton
                              type="button"
                              variant="inline"
                              icon={Trash2}
                              label="Delete domain"
                              onClick={() => handleDeleteDomain(domain.id)}
                              disabled={savingDomainId === domain.id}
                            >
                              Delete
                            </CrudActionButton>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="admin-list-empty" colSpan={4}>
                        No tenant-domain records yet for this site.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <form onSubmit={handleSaveProvisioning} className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-lg font-bold text-slate-950">Provisioning</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Track launch readiness, the intended code-owned theme manifest slug, and site-level rollout notes.
              </p>

              {provisioningError ? <div className="admin-list-error mt-4">{provisioningError}</div> : null}
              {provisioningSuccess ? (
                <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-700">
                  {provisioningSuccess}
                </div>
              ) : null}

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div>
                  <label className="form-label text-slate-500">Launch Status</label>
                  <select
                    value={provisioningForm.launchStatus}
                    onChange={(event) =>
                      setProvisioningForm((current) => ({
                        ...current,
                        launchStatus: event.target.value as LaunchStatus,
                      }))
                    }
                    className="form-input border-slate-300 bg-white text-slate-950"
                  >
                    <option value="PRELAUNCH">Prelaunch</option>
                    <option value="LIVE">Live</option>
                    <option value="PAUSED">Paused</option>
                  </select>
                </div>

                <div>
                  <label className="form-label text-slate-500">Theme Manifest Slug</label>
                  <input
                    type="text"
                    value={provisioningForm.themeManifestSlug}
                    onChange={(event) =>
                      setProvisioningForm((current) => ({
                        ...current,
                        themeManifestSlug: event.target.value,
                      }))
                    }
                    className="form-input border-slate-300 bg-white text-slate-950"
                    placeholder="river-valley-local"
                  />
                  <div className="mt-2 text-xs leading-5 text-slate-500">
                    Code-owned manifests available: {availableThemeManifestSlugs.join(', ')}
                  </div>
                  {!themeManifestExists ? (
                    <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      This slug does not match a registered theme manifest in code. Save will be blocked until it
                      matches one of the available manifests.
                    </div>
                  ) : null}
                </div>

                <div className="lg:col-span-2">
                  <label className="form-label text-slate-500">Provisioning Notes</label>
                  <textarea
                    value={provisioningForm.provisioningNotes}
                    onChange={(event) =>
                      setProvisioningForm((current) => ({
                        ...current,
                        provisioningNotes: event.target.value,
                      }))
                    }
                    className="form-textarea border-slate-300 bg-white text-slate-950"
                    rows={6}
                    placeholder="Track launch blockers, DNS progress, theme mapping, content readiness, or anything else specific to this site."
                  />
                </div>
              </div>
              </div>

              <div className="flex justify-end">
                <button type="submit" disabled={isSavingProvisioning} className="btn-primary">
                  {isSavingProvisioning ? 'Saving...' : 'Save Provisioning'}
                </button>
              </div>
            </form>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-950">Coverage Summary</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Active canonical places currently attached to this site through tenant coverage.
                  </p>
                </div>
                <a
                  href={`/admin/coverage`}
                  className="btn-neutral"
                >
                  Open Coverage
                </a>
              </div>

              {coverageError ? <div className="admin-list-error mt-4">{coverageError}</div> : null}
              {coverageSuccess ? (
                <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-700">
                  {coverageSuccess}
                </div>
              ) : null}

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Coverage Areas</div>
                  <div className="mt-2 text-2xl font-bold text-slate-950">{site.coverageAreas.length}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Primary Areas</div>
                  <div className="mt-2 text-2xl font-bold text-slate-950">
                    {site.coverageAreas.filter((entry) => entry.isPrimary).length}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Primary Domain</div>
                  <div className="mt-2 text-sm font-semibold text-slate-950">
                    {primaryDomain?.domain || 'Not set'}
                  </div>
                </div>
              </div>

              <form onSubmit={handleCreateCoverage} className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_auto]">
                  <div>
                    <label className="form-label text-slate-500">Place</label>
                    {selectedPlace ? (
                      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                        <div className="font-semibold text-slate-900">{selectedPlace.displayName}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {selectedPlace.type}
                          {selectedPlace.admin2Name ? ` • ${selectedPlace.admin2Name}` : ''}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPlace(null);
                            setPlaceResults([]);
                          }}
                          className="mt-2 text-xs font-semibold text-[#0f5771] hover:underline"
                        >
                          Choose a different place
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={placeQuery}
                          onChange={(event) => setPlaceQuery(event.target.value)}
                          placeholder="Search for a place"
                          className="form-input border-slate-300 bg-white text-slate-950"
                        />
                        <div className="rounded-xl border border-slate-200 bg-white">
                          {isLoadingPlaces ? (
                            <div className="px-4 py-3 text-sm text-slate-500">Searching places...</div>
                          ) : placeResults.length > 0 ? (
                            placeResults.map((place) => (
                              <button
                                key={place.id}
                                type="button"
                                onClick={() => {
                                  setSelectedPlace(place);
                                  setCoverageForm((current) => ({ ...current, placeId: place.id }));
                                  setPlaceQuery('');
                                  setPlaceResults([]);
                                }}
                                className="block w-full border-b border-slate-200 px-4 py-3 text-left text-sm text-slate-700 last:border-b-0 hover:bg-slate-50"
                              >
                                <div className="font-semibold text-slate-900">{place.displayName}</div>
                                <div className="text-xs text-slate-500">
                                  {place.type}
                                  {place.admin2Name ? ` • ${place.admin2Name}` : ''}
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-3 text-sm text-slate-500">Search for a canonical place to attach.</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="form-label text-slate-500">Coverage Type</label>
                    <select
                      value={coverageForm.coverageType}
                      onChange={(event) =>
                        setCoverageForm((current) => ({
                          ...current,
                          coverageType: event.target.value as CoverageType,
                        }))
                      }
                      className="form-input border-slate-300 bg-white text-slate-950"
                    >
                      {COVERAGE_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={coverageForm.isPrimary}
                        onChange={(event) =>
                          setCoverageForm((current) => ({ ...current, isPrimary: event.target.checked }))
                        }
                      />
                      Mark as primary
                    </label>
                  </div>

                  <div className="flex items-end justify-end">
                    <button type="submit" disabled={isSavingCoverage} className="btn-primary">
                      {isSavingCoverage ? 'Adding...' : 'Add Coverage'}
                    </button>
                  </div>
                </div>
              </form>

              <div className="mt-4 admin-list-table-wrap">
                <table className="admin-list-table">
                  <thead className="admin-list-head">
                    <tr>
                      <th className="admin-list-header-cell">Place</th>
                      <th className="admin-list-header-cell">Type</th>
                      <th className="admin-list-header-cell">Coverage</th>
                      <th className="admin-list-header-cell">Primary</th>
                      <th className="admin-list-header-cell">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {site.coverageAreas.length > 0 ? (
                      site.coverageAreas.map((entry) => (
                        <tr key={entry.id} className="admin-list-row">
                          <td className="admin-list-cell">{entry.place.displayName}</td>
                          <td className="admin-list-cell">{entry.place.type}</td>
                          <td className="admin-list-cell">
                            <select
                              className="admin-list-cell-select"
                              value={entry.coverageType}
                              disabled={savingCoverageId === entry.id}
                              onChange={(event) =>
                                handleCoverageTypeChange(entry.id, event.target.value as CoverageType)
                              }
                            >
                              {COVERAGE_TYPES.map((type) => (
                                <option key={type} value={type}>
                                  {type}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="admin-list-cell">
                            {entry.isPrimary ? (
                              <span className="text-xs font-semibold text-slate-500">Yes</span>
                            ) : (
                              <CrudActionButton
                                type="button"
                                variant="inline"
                                icon={Plus}
                                label="Make primary"
                                onClick={() => handleCoveragePrimaryChange(entry.id)}
                                disabled={savingCoverageId === entry.id}
                              >
                                Make primary
                              </CrudActionButton>
                            )}
                          </td>
                          <td className="admin-list-cell">
                            <div className="flex flex-wrap gap-3">
                              <CrudActionButton
                                type="button"
                                variant="inline"
                                icon={Globe}
                                label={entry.isActive ? 'Deactivate' : 'Activate'}
                                onClick={() => handleCoverageActiveToggle(entry.id, !entry.isActive)}
                                disabled={savingCoverageId === entry.id}
                              >
                                {entry.isActive ? 'Deactivate' : 'Activate'}
                              </CrudActionButton>
                              <CrudActionButton
                                type="button"
                                variant="inline"
                                icon={Trash2}
                                label="Delete coverage"
                                onClick={() => handleDeleteCoverage(entry.id)}
                                disabled={savingCoverageId === entry.id}
                              >
                                Delete
                              </CrudActionButton>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="admin-list-empty" colSpan={5}>
                          No active coverage areas are attached to this site yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
