/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import ImageUpload from '@/components/shared/ImageUpload';

// ─── Types ────────────────────────────────────────────────────────────────────

type ManagePageData = {
  id: string;
  title: string;
  slug: string;
  shortSummary: string | null;
  biography: string | null;
  lifeStory: string | null;
  serviceDetails: string | null;
  familyDetails: string | null;
  videoEmbeds: string[];
  serviceStreamUrl: string | null;
  heroImageUrl: string | null;
};

type PhotoRow = {
  id: string;
  imageUrl: string;
  caption: string | null;
  status: string;
};

type MemoryRow = {
  id: string;
  displayName: string | null;
  relationshipToDeceased: string | null;
  body: string;
  createdAt: Date;
};

type ContributorRow = {
  id: string;
  role: string;
  displayName: string | null;
  user: { firstName: string; lastName: string } | null;
};

interface Props {
  page: ManagePageData;
  pendingMemories: MemoryRow[];
  photos: PhotoRow[];
  contributors: ContributorRow[];
  isPrimarySteward: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SHORT_SUMMARY_LIMIT = 300;

const TABS = ['Memorial text', 'Photos & videos', 'Memories', 'Stewards'] as const;
type Tab = (typeof TABS)[number];

function fmtDate(d: Date | string): string {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function roleBadge(role: string): string {
  switch (role) {
    case 'STEWARD':
      return 'Steward';
    case 'CO_STEWARD':
      return 'Co-steward';
    case 'FAMILY':
      return 'Family';
    default:
      return role.charAt(0) + role.slice(1).toLowerCase();
  }
}

function statusBadgeClass(status: string): string {
  switch (status.toUpperCase()) {
    case 'APPROVED':
      return 'bg-emerald-100 text-emerald-800';
    case 'PENDING':
      return 'bg-amber-100 text-amber-800';
    case 'REJECTED':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function MemorialManageClient({
  page: initialPage,
  pendingMemories: initialPendingMemories,
  photos: initialPhotos,
  contributors: initialContributors,
  isPrimarySteward,
}: Props) {
  useSession(); // keep session fresh; unused value intentional

  const [activeTab, setActiveTab] = useState<Tab>('Memorial text');

  // ── Tab 1 state ──────────────────────────────────────────────────────────────
  const [page, setPage] = useState<ManagePageData>(initialPage);
  const [textSaving, setTextSaving] = useState(false);
  const [textError, setTextError] = useState('');
  const [textSuccess, setTextSuccess] = useState('');

  // ── Tab 2 state ──────────────────────────────────────────────────────────────
  const [photos, setPhotos] = useState<PhotoRow[]>(initialPhotos);
  const [videoUrls, setVideoUrls] = useState<string[]>(
    initialPage.videoEmbeds.length > 0 ? initialPage.videoEmbeds : ['']
  );
  const [serviceStreamUrl, setServiceStreamUrl] = useState(initialPage.serviceStreamUrl ?? '');
  const [photoRemoving, setPhotoRemoving] = useState<Record<string, boolean>>({});
  const [mediaError, setMediaError] = useState('');
  const [mediaSuccess, setMediaSuccess] = useState('');
  const [mediaSaving, setMediaSaving] = useState(false);
  // Per-new-photo captions keyed by imageUrl
  const [newPhotoCaptions, setNewPhotoCaptions] = useState<Record<string, string>>({});

  // ── Tab 3 state ──────────────────────────────────────────────────────────────
  const [pendingMemories, setPendingMemories] = useState<MemoryRow[]>(initialPendingMemories);
  const [memoryActing, setMemoryActing] = useState<Record<string, boolean>>({});
  const [memoryError, setMemoryError] = useState('');

  // ── Tab 4 state ──────────────────────────────────────────────────────────────
  const [contributors, setContributors] = useState<ContributorRow[]>(initialContributors);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'CO_STEWARD' | 'FAMILY'>('CO_STEWARD');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  // ── Shared input/textarea class ───────────────────────────────────────────────
  const inputClass =
    'w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900';
  const textareaClass =
    'w-full rounded-[24px] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900';
  const submitBtnClass =
    'rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60';
  const outlineBtnClass =
    'rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50';

  // ── Tab 1: Save text fields ───────────────────────────────────────────────────

  async function handleTextSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTextError('');
    setTextSuccess('');

    if (page.shortSummary && page.shortSummary.length > SHORT_SUMMARY_LIMIT) {
      setTextError(
        `Short summary is too long — ${page.shortSummary.length} of ${SHORT_SUMMARY_LIMIT} characters used.`
      );
      return;
    }

    setTextSaving(true);
    try {
      const res = await fetch(`/api/memoriam/pages/${page.id}/manage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: page.title,
          shortSummary: page.shortSummary ?? undefined,
          biography: page.biography ?? undefined,
          lifeStory: page.lifeStory ?? undefined,
          serviceDetails: page.serviceDetails ?? undefined,
          familyDetails: page.familyDetails ?? undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save memorial text');
      }
      setTextSuccess('Memorial text saved.');
    } catch (err) {
      setTextError(err instanceof Error ? err.message : 'Failed to save memorial text');
    } finally {
      setTextSaving(false);
    }
  }

  // ── Tab 2: Remove photo ────────────────────────────────────────────────────────

  async function handleRemovePhoto(photoId: string) {
    setPhotoRemoving((prev) => ({ ...prev, [photoId]: true }));
    setMediaError('');
    try {
      const res = await fetch(`/api/memoriam/photos/${photoId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to remove photo');
      }
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch (err) {
      setMediaError(err instanceof Error ? err.message : 'Failed to remove photo');
    } finally {
      setPhotoRemoving((prev) => ({ ...prev, [photoId]: false }));
    }
  }

  // ── Tab 2: New photo uploaded via ImageUpload ──────────────────────────────────

  async function handleNewPhoto(img: { url: string; filename: string; size: number }) {
    setMediaError('');
    const setAsHero = photos.length === 0;
    const caption = newPhotoCaptions[img.url]?.trim() || undefined;

    try {
      const res = await fetch(`/api/memoriam/pages/${page.id}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: img.url, caption, setAsHero }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save photo');
      }
      // Add to local list as PENDING
      setPhotos((prev) => [
        ...prev,
        {
          id: (data.id as string) ?? img.url,
          imageUrl: img.url,
          caption: caption ?? null,
          status: 'PENDING',
        },
      ]);
    } catch (err) {
      setMediaError(err instanceof Error ? err.message : 'Failed to save photo');
    }
  }

  // ── Tab 2: Save video / stream changes ────────────────────────────────────────

  async function handleMediaSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMediaError('');
    setMediaSuccess('');
    setMediaSaving(true);
    try {
      const res = await fetch(`/api/memoriam/pages/${page.id}/manage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoEmbeds: videoUrls.filter((u) => u.trim()),
          serviceStreamUrl: serviceStreamUrl.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save video details');
      }
      setPage((prev) => ({
        ...prev,
        videoEmbeds: videoUrls.filter((u) => u.trim()),
        serviceStreamUrl: serviceStreamUrl.trim() || null,
      }));
      setMediaSuccess('Video details saved.');
    } catch (err) {
      setMediaError(err instanceof Error ? err.message : 'Failed to save video details');
    } finally {
      setMediaSaving(false);
    }
  }

  // ── Tab 3: Approve / Reject memory ────────────────────────────────────────────

  async function handleMemoryAction(memoryId: string, action: 'approve' | 'reject') {
    setMemoryActing((prev) => ({ ...prev, [memoryId]: true }));
    setMemoryError('');
    try {
      const res = await fetch(`/api/memoriam/pages/${page.id}/manage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memoryAction: action, memoryId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Failed to ${action} memory`);
      }
      setPendingMemories((prev) => prev.filter((m) => m.id !== memoryId));
    } catch (err) {
      setMemoryError(err instanceof Error ? err.message : `Failed to ${action} memory`);
    } finally {
      setMemoryActing((prev) => ({ ...prev, [memoryId]: false }));
    }
  }

  // ── Tab 4: Invite contributor ──────────────────────────────────────────────────

  async function handleInvite(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setInviteError('');
    setInviteSuccess('');

    if (!inviteEmail.trim()) {
      setInviteError('Enter an email address to look up the user.');
      return;
    }

    setInviting(true);
    try {
      const res = await fetch(`/api/memoriam/pages/${page.id}/contributors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to invite contributor');
      }
      setInviteSuccess(
        `Invitation sent to ${inviteEmail.trim()} as ${inviteRole === 'CO_STEWARD' ? 'co-steward' : 'family contributor'}.`
      );
      setInviteEmail('');
      // Optimistically add to list if the API returned a contributor record
      if (data.contributor) {
        setContributors((prev) => [
          ...prev,
          {
            id: (data.contributor.id as string),
            role: inviteRole as string,
            displayName: null,
            user: data.contributor.user ?? null,
          },
        ]);
      }
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to invite contributor');
    } finally {
      setInviting(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={`/memoriam/${page.slug}`}
            className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            ← Back to memorial
          </Link>
          <h1 className="text-2xl font-bold text-slate-950">Manage: {page.title}</h1>
        </div>
      </div>

      {/* Tab bar */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-6 overflow-x-auto" aria-label="Manage tabs">
          {TABS.map((tab) => {
            const isActive = tab === activeTab;
            const isPending = tab === 'Memories' && pendingMemories.length > 0;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap pb-3 text-sm font-semibold transition ${
                  isActive
                    ? 'border-b-2 border-slate-900 text-slate-900'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab}
                {isPending && (
                  <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {pendingMemories.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Tab 1: Memorial text ────────────────────────────────────────────────── */}
      {activeTab === 'Memorial text' && (
        <section className="rounded-[28px] border border-slate-200 bg-white p-6">
          <h2 className="mb-5 text-lg font-semibold text-slate-950">Memorial text</h2>
          <form onSubmit={handleTextSave} className="space-y-5">
            {/* Title */}
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-800">Title</span>
              <input
                value={page.title}
                onChange={(e) => setPage((prev) => ({ ...prev, title: e.target.value }))}
                className={inputClass}
                required
              />
            </label>

            {/* Short summary */}
            <div className="space-y-2">
              <span className="text-sm font-semibold text-slate-800">Short summary</span>
              <p className="text-xs text-slate-500">
                One or two sentences shown at the top of the memorial page.
              </p>
              <div className="relative">
                <textarea
                  value={page.shortSummary ?? ''}
                  onChange={(e) =>
                    setPage((prev) => ({ ...prev, shortSummary: e.target.value }))
                  }
                  rows={3}
                  maxLength={SHORT_SUMMARY_LIMIT}
                  className={textareaClass + ' pb-7'}
                />
                <span
                  className={`absolute bottom-3 right-4 text-xs ${
                    (page.shortSummary?.length ?? 0) >= SHORT_SUMMARY_LIMIT
                      ? 'font-semibold text-red-600'
                      : (page.shortSummary?.length ?? 0) >= SHORT_SUMMARY_LIMIT * 0.9
                      ? 'text-amber-600'
                      : 'text-slate-400'
                  }`}
                >
                  {page.shortSummary?.length ?? 0} / {SHORT_SUMMARY_LIMIT}
                </span>
              </div>
            </div>

            {/* Biography */}
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-800">Biography</span>
              <textarea
                value={page.biography ?? ''}
                onChange={(e) => setPage((prev) => ({ ...prev, biography: e.target.value }))}
                rows={7}
                className={textareaClass}
                placeholder="Basic biography, affiliations, and facts"
              />
            </label>

            {/* Life story */}
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-800">Life story</span>
              <textarea
                value={page.lifeStory ?? ''}
                onChange={(e) => setPage((prev) => ({ ...prev, lifeStory: e.target.value }))}
                rows={7}
                className={textareaClass}
                placeholder="Longer memorial writing"
              />
            </label>

            {/* Service details + family details side by side on wider screens */}
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-800">Service details</span>
                <textarea
                  value={page.serviceDetails ?? ''}
                  onChange={(e) =>
                    setPage((prev) => ({ ...prev, serviceDetails: e.target.value }))
                  }
                  rows={5}
                  className={textareaClass}
                  placeholder="Visitation, funeral, cemetery, or memorial service details"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-800">Family details</span>
                <textarea
                  value={page.familyDetails ?? ''}
                  onChange={(e) =>
                    setPage((prev) => ({ ...prev, familyDetails: e.target.value }))
                  }
                  rows={5}
                  className={textareaClass}
                  placeholder="Surviving relatives and family context"
                />
              </label>
            </div>

            {/* Feedback */}
            {textError && (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {textError}
              </p>
            )}
            {textSuccess && (
              <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {textSuccess}
              </p>
            )}

            <div className="flex justify-end">
              <button type="submit" disabled={textSaving} className={submitBtnClass}>
                {textSaving ? 'Saving...' : 'Save memorial text'}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* ── Tab 2: Photos & videos ───────────────────────────────────────────────── */}
      {activeTab === 'Photos & videos' && (
        <div className="space-y-6">
          {/* Current photos */}
          <section className="rounded-[28px] border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-950">Current photos</h2>

            {photos.length === 0 ? (
              <p className="text-sm text-slate-500">No photos uploaded yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {photos.map((photo) => (
                  <div key={photo.id} className="space-y-2">
                    <div className="relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                      <img
                        src={photo.imageUrl}
                        alt={photo.caption ?? 'Memorial photo'}
                        className="h-full w-full object-cover"
                      />
                      {photo.imageUrl === page.heroImageUrl && (
                        <span className="absolute left-2 top-2 rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px] font-bold text-white">
                          Hero
                        </span>
                      )}
                    </div>
                    {photo.caption && (
                      <p className="truncate text-xs text-slate-500">{photo.caption}</p>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusBadgeClass(
                          photo.status
                        )}`}
                      >
                        {photo.status.toLowerCase()}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(photo.id)}
                        disabled={photoRemoving[photo.id]}
                        className="text-xs font-medium text-red-600 transition hover:text-red-800 disabled:opacity-50"
                      >
                        {photoRemoving[photo.id] ? 'Removing...' : 'Remove'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Upload new photos */}
          <section className="rounded-[28px] border border-slate-200 bg-white p-6">
            <h2 className="mb-1 text-lg font-semibold text-slate-950">Add photos</h2>
            <p className="mb-4 text-sm text-slate-500">
              Uploaded photos go into a pending review queue. The first photo added to an empty
              gallery will be set as the hero image.
            </p>
            <ImageUpload
              context="memoriam"
              maxFiles={20}
              value={[]}
              onUpload={handleNewPhoto}
              helperText="JPG, PNG, or WebP — up to 5 MB per photo"
            />
            {/* Caption inputs for newly queued (uploaded but caption not yet committed) */}
            {photos.filter((p) => p.status === 'PENDING').length > 0 && (
              <div className="mt-4 space-y-2">
                {photos
                  .filter((p) => p.status === 'PENDING')
                  .map((photo) => (
                    <div key={photo.id} className="flex items-center gap-3">
                      <img
                        src={photo.imageUrl}
                        alt=""
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                      <input
                        type="text"
                        value={newPhotoCaptions[photo.imageUrl] ?? photo.caption ?? ''}
                        onChange={(e) =>
                          setNewPhotoCaptions((prev) => ({
                            ...prev,
                            [photo.imageUrl]: e.target.value,
                          }))
                        }
                        placeholder="Caption (optional)"
                        className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                      />
                    </div>
                  ))}
              </div>
            )}
          </section>

          {/* Videos */}
          <section className="rounded-[28px] border border-slate-200 bg-white p-6">
            <h2 className="mb-1 text-lg font-semibold text-slate-950">Videos</h2>
            <p className="mb-4 text-sm text-slate-500">
              Add YouTube or Vimeo tribute videos and a service stream link.
            </p>

            <form onSubmit={handleMediaSave} className="space-y-5">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-800">YouTube / Vimeo links</p>
                {videoUrls.map((url, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) =>
                        setVideoUrls((prev) =>
                          prev.map((u, i) => (i === index ? e.target.value : u))
                        )
                      }
                      className={inputClass}
                      placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
                    />
                    {videoUrls.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setVideoUrls((prev) => prev.filter((_, i) => i !== index))
                        }
                        className={outlineBtnClass}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                {videoUrls.length < 8 && (
                  <button
                    type="button"
                    onClick={() => setVideoUrls((prev) => [...prev, ''])}
                    className={outlineBtnClass}
                  >
                    Add another video
                  </button>
                )}
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-800">Service stream URL</span>
                <p className="text-xs text-slate-500">
                  A funeral home stream, church livestream, or recording — displayed as a plain link.
                </p>
                <input
                  type="url"
                  value={serviceStreamUrl}
                  onChange={(e) => setServiceStreamUrl(e.target.value)}
                  className={inputClass}
                  placeholder="https://..."
                />
              </label>

              {/* Shared media feedback */}
              {mediaError && (
                <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {mediaError}
                </p>
              )}
              {mediaSuccess && (
                <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {mediaSuccess}
                </p>
              )}

              <div className="flex justify-end">
                <button type="submit" disabled={mediaSaving} className={submitBtnClass}>
                  {mediaSaving ? 'Saving...' : 'Save video details'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* ── Tab 3: Memories ──────────────────────────────────────────────────────── */}
      {activeTab === 'Memories' && (
        <section className="rounded-[28px] border border-slate-200 bg-white p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Pending memories</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                {pendingMemories.length === 0
                  ? 'No pending memories — all caught up.'
                  : `${pendingMemories.length} memory${pendingMemories.length !== 1 ? 'ies' : 'y'} waiting for review`}
              </p>
            </div>
          </div>

          {memoryError && (
            <p className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {memoryError}
            </p>
          )}

          {pendingMemories.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <span className="text-3xl" aria-hidden="true">
                ✓
              </span>
              <p className="text-sm text-slate-500">
                No memories are waiting for review right now.
              </p>
              <Link
                href={`/memoriam/${page.slug}`}
                className="mt-1 text-sm font-medium text-slate-700 underline underline-offset-2 transition hover:text-slate-900"
              >
                View the memorial page
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingMemories.map((memory) => {
                const acting = memoryActing[memory.id];
                return (
                  <div
                    key={memory.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                      <span className="text-sm font-semibold text-slate-900">
                        {memory.displayName ?? 'Anonymous'}
                      </span>
                      {memory.relationshipToDeceased && (
                        <span className="text-sm text-slate-500">
                          · {memory.relationshipToDeceased}
                        </span>
                      )}
                      <span className="ml-auto text-xs text-slate-400">
                        {fmtDate(memory.createdAt)}
                      </span>
                    </div>
                    <p className="mb-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {memory.body}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleMemoryAction(memory.id, 'approve')}
                        disabled={acting}
                        className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {acting ? 'Working...' : 'Approve'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMemoryAction(memory.id, 'reject')}
                        disabled={acting}
                        className="rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {acting ? 'Working...' : 'Reject'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ── Tab 4: Stewards ──────────────────────────────────────────────────────── */}
      {activeTab === 'Stewards' && (
        <div className="space-y-6">
          {/* Current contributors */}
          <section className="rounded-[28px] border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-950">Current stewards</h2>
            {contributors.length === 0 ? (
              <p className="text-sm text-slate-500">No contributors yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {contributors.map((c) => {
                  const name =
                    c.user
                      ? `${c.user.firstName} ${c.user.lastName}`.trim()
                      : c.displayName ?? 'Unknown';
                  return (
                    <li key={c.id} className="flex items-center gap-4 py-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{name}</p>
                      </div>
                      <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                        {roleBadge(c.role)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Invite form (primary steward + global reviewers only) */}
          {isPrimarySteward ? (
            <section className="rounded-[28px] border border-slate-200 bg-white p-6">
              <h2 className="mb-1 text-lg font-semibold text-slate-950">Invite a co-steward</h2>
              <p className="mb-5 text-sm text-slate-500">
                Enter the email address of the person to invite. They must already have an account.
              </p>

              <form onSubmit={handleInvite} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-slate-800">Email address</span>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className={inputClass}
                      placeholder="name@example.com"
                      required
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-slate-800">Role</span>
                    <select
                      value={inviteRole}
                      onChange={(e) =>
                        setInviteRole(e.target.value as 'CO_STEWARD' | 'FAMILY')
                      }
                      className={inputClass}
                    >
                      <option value="CO_STEWARD">Co-steward</option>
                      <option value="FAMILY">Family contributor</option>
                    </select>
                  </label>
                </div>

                {inviteError && (
                  <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {inviteError}
                  </p>
                )}
                {inviteSuccess && (
                  <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {inviteSuccess}
                  </p>
                )}

                <div className="flex justify-end">
                  <button type="submit" disabled={inviting} className={submitBtnClass}>
                    {inviting ? 'Inviting...' : 'Send invitation'}
                  </button>
                </div>
              </form>
            </section>
          ) : (
            <section className="rounded-[28px] border border-slate-200 bg-slate-50 px-6 py-5 text-sm text-slate-600">
              Only the primary steward can invite co-stewards. Contact the primary steward if you
              need to add someone.
            </section>
          )}
        </div>
      )}
    </div>
  );
}
