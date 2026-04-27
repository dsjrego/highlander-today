'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useSession } from 'next-auth/react';
import FormCard, { FormCardActions } from '@/components/shared/FormCard';
import InternalPageHeader from '@/components/shared/InternalPageHeader';
import ImageUpload from '@/components/shared/ImageUpload';
import { hasTrustedAccess } from '@/lib/trust-access';

type PhotoEntry = {
  imageUrl: string;
  caption: string;
};

type MemoriamCategoryOption = {
  id: string;
  name: string;
  slug: string;
  parentCategory: {
    name: string;
  } | null;
};

type VerificationFormRow = {
  verificationRole:
    | 'FAMILY'
    | 'FUNERAL_HOME'
    | 'CLERGY'
    | 'CEMETERY'
    | 'ORGANIZATION'
    | 'TRUSTED_CONFIRMATION'
    | 'STAFF';
  verifierName: string;
  verifierOrganization: string;
  verifierContact: string;
  note: string;
};

// Character limits for the two capped text fields
const SUMMARY_LIMIT = 1000;
const SHORT_SUMMARY_LIMIT = 300;

type MemoriamFormState = {
  submissionType: 'DEATH_NOTICE' | 'MEMORIAL_PAGE' | 'PRIVATE_REQUEST';
  categoryId: string;
  relationshipToDeceased: string;
  requesterName: string;
  requesterEmail: string;
  requesterPhone: string;
  fullName: string;
  preferredName: string;
  townName: string;
  birthTownName: string;
  deathTownName: string;
  birthDate: string;
  deathDate: string;
  summary: string;
  title: string;
  shortSummary: string;
  biography: string;
  lifeStory: string;
  serviceDetails: string;
  familyDetails: string;
  sourceNote: string;
};

const RELATIONSHIP_OPTIONS = [
  'Immediate family',
  'Extended family',
  'Funeral home',
  'Clergy',
  'Friend',
  'Classmate',
  'Neighbor',
  'Organization representative',
  'Other',
] as const;

const VERIFICATION_ROLE_OPTIONS: VerificationFormRow['verificationRole'][] = [
  'FAMILY',
  'FUNERAL_HOME',
  'CLERGY',
  'CEMETERY',
  'ORGANIZATION',
  'TRUSTED_CONFIRMATION',
  'STAFF',
];

const EMPTY_VERIFICATION: VerificationFormRow = {
  verificationRole: 'FAMILY',
  verifierName: '',
  verifierOrganization: '',
  verifierContact: '',
  note: '',
};

const EMPTY_FORM: MemoriamFormState = {
  submissionType: 'DEATH_NOTICE',
  categoryId: '',
  relationshipToDeceased: '',
  requesterName: '',
  requesterEmail: '',
  requesterPhone: '',
  fullName: '',
  preferredName: '',
  townName: '',
  birthTownName: '',
  deathTownName: '',
  birthDate: '',
  deathDate: '',
  summary: '',
  title: '',
  shortSummary: '',
  biography: '',
  lifeStory: '',
  serviceDetails: '',
  familyDetails: '',
  sourceNote: '',
};

/** Returns whole years between two date strings, or null if either is missing/invalid. */
function calculateAge(birthDate: string, deathDate: string): number | null {
  if (!birthDate || !deathDate) return null;
  const birth = new Date(`${birthDate}T00:00:00`);
  const death = new Date(`${deathDate}T00:00:00`);
  if (isNaN(birth.getTime()) || isNaN(death.getTime())) return null;
  let age = death.getFullYear() - birth.getFullYear();
  const monthDiff = death.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && death.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

function formatVerificationLabel(value: VerificationFormRow['verificationRole']) {
  return value
    .split('_')
    .map((segment) => segment.charAt(0) + segment.slice(1).toLowerCase())
    .join(' ');
}

export default function MemoriamSubmitClient({
  categories,
}: {
  categories: MemoriamCategoryOption[];
}) {
  const { data: session, status } = useSession();
  const [form, setForm] = useState<MemoriamFormState>(EMPTY_FORM);
  const [verifications, setVerifications] = useState<VerificationFormRow[]>([EMPTY_VERIFICATION]);
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [videoUrls, setVideoUrls] = useState<string[]>(['']);
  const [serviceStreamUrl, setServiceStreamUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const currentUser = session?.user as
    | {
        name?: string | null;
        email?: string | null;
        trust_level?: string;
        role?: string;
      }
    | undefined;

  const isAuthenticated = status === 'authenticated' && Boolean(session?.user);
  const isTrusted = hasTrustedAccess({
    trustLevel: currentUser?.trust_level,
    role: currentUser?.role,
  });

  const computedAge = calculateAge(form.birthDate, form.deathDate);

  function updateForm(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function updateVerification(
    index: number,
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = event.target;
    setVerifications((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, [name]: value } : row))
    );
  }

  function addVerificationRow() {
    setVerifications((current) => [...current, EMPTY_VERIFICATION]);
  }

  function removeVerificationRow(index: number) {
    setVerifications((current) => current.filter((_, rowIndex) => rowIndex !== index));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!isTrusted) {
      setError('Trusted membership is required before you can start a Memoriam submission.');
      return;
    }

    if (!form.fullName.trim()) {
      setError('Full name of the deceased is required.');
      return;
    }

    if (!form.relationshipToDeceased.trim()) {
      setError('Tell us your relationship to the deceased.');
      return;
    }

    if (!form.summary.trim() || form.summary.trim().length < 10) {
      setError('Add a short factual overview so staff can review the submission.');
      return;
    }

    if (form.summary.length > SUMMARY_LIMIT) {
      setError(
        `The factual overview is too long — ${form.summary.length} of ${SUMMARY_LIMIT} characters used. Please shorten it before submitting.`
      );
      return;
    }

    if (form.shortSummary.length > SHORT_SUMMARY_LIMIT) {
      setError(
        `The short memorial text is too long — ${form.shortSummary.length} of ${SHORT_SUMMARY_LIMIT} characters used. Please shorten it before submitting.`
      );
      return;
    }

    if (!form.requesterName.trim() && !form.requesterEmail.trim()) {
      setError('Please include your name or email so staff can follow up if needed.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/memoriam/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submissionType: form.submissionType,
          status: 'PENDING_REVIEW',
          relationshipToDeceased: form.relationshipToDeceased,
          requesterName: form.requesterName.trim() || currentUser?.name || undefined,
          requesterEmail: form.requesterEmail.trim() || currentUser?.email || undefined,
          requesterPhone: form.requesterPhone.trim() || undefined,
          summary: form.summary,
          person: {
            fullName: form.fullName,
            preferredName: form.preferredName || undefined,
            age: computedAge ?? undefined,
            townName: form.townName || undefined,
            birthTownName: form.birthTownName || undefined,
            deathTownName: form.deathTownName || undefined,
            birthDate: form.birthDate ? new Date(`${form.birthDate}T00:00:00`).toISOString() : undefined,
            deathDate: form.deathDate ? new Date(`${form.deathDate}T00:00:00`).toISOString() : undefined,
          },
          pageDraft: {
            pageType: form.submissionType === 'DEATH_NOTICE' ? 'DEATH_NOTICE' : 'MEMORIAL_PAGE',
            title: form.title || undefined,
            shortSummary: form.shortSummary || undefined,
            biography: form.biography || undefined,
            lifeStory: form.lifeStory || undefined,
            serviceDetails: form.serviceDetails || undefined,
            familyDetails: form.familyDetails || undefined,
            provenanceNote: form.sourceNote || undefined,
            categoryId: form.categoryId || undefined,
            videoEmbeds: videoUrls.filter((u) => u.trim()),
            serviceStreamUrl: serviceStreamUrl.trim() || undefined,
          },
          photos: photos.map((p) => ({
            imageUrl: p.imageUrl,
            caption: p.caption.trim() || undefined,
          })),
          verifications: verifications
            .filter((row) => row.verifierName.trim())
            .map((row) => ({
              verificationRole: row.verificationRole,
              verifierName: row.verifierName.trim(),
              verifierOrganization: row.verifierOrganization.trim() || undefined,
              verifierContact: row.verifierContact.trim() || undefined,
              note: row.note.trim() || undefined,
            })),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const validationMessage = Array.isArray(data.details)
          ? data.details
              .map((detail: { message?: string }) => detail.message)
              .filter(Boolean)
              .join(', ')
          : '';
        throw new Error(validationMessage || data.error || 'Failed to submit memoriam request');
      }

      setForm({
        ...EMPTY_FORM,
        requesterName: currentUser?.name || '',
        requesterEmail: currentUser?.email || '',
      });
      setVerifications([EMPTY_VERIFICATION]);
      setPhotos([]);
      setVideoUrls(['']);
      setServiceStreamUrl('');
      setSuccess(
        'Memoriam submission received. Staff will review the factual record, verification details, and any memorial text before anything is published.'
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Failed to submit memoriam request'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (status === 'loading') {
    return <p className="page-intro-copy py-10 text-center">Loading...</p>;
  }

  if (!isAuthenticated) {
    return (
      <div className="space-y-8">
        <InternalPageHeader
          title="Memoriam Submission"
          description="Begin a death notice or memorial request for staff review."
          mobileAlign="start"
        />
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
          <h2 className="text-xl font-bold text-slate-950">Sign in to continue</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Memoriam submissions require an account because the record may need follow-up, verification, or family clarification before publication.
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

  if (!isTrusted) {
    return (
      <div className="space-y-8">
        <InternalPageHeader
          title="Memoriam Submission"
          description="Begin a death notice or memorial request for staff review."
          mobileAlign="start"
        />
        <section className="rounded-[28px] border border-amber-200 bg-amber-50 px-6 py-5 text-amber-900">
          Trusted membership is required before you can begin a public Memoriam submission. This is one of the safeguards that helps prevent false death notices, identity mistakes, and harmful misuse.
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <InternalPageHeader
        title="Memoriam Submission"
        mobileAlign="start"
      />

      <section className="rounded-[28px] border border-white/10 bg-white/82 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur">
        <h2 className="text-lg font-semibold text-slate-950">What happens next</h2>
        <div className="mt-4 grid gap-4 text-sm leading-7 text-slate-600 md:grid-cols-3">
          <div>
            <p className="font-semibold text-slate-900">1. Submit the record</p>
            <p>Share the factual details, your relationship to the deceased, and any verification contact we should know about.</p>
          </div>
          <div>
            <p className="font-semibold text-slate-900">2. Staff reviews it</p>
            <p>Publication does not happen automatically. The memoriam queue checks identity, wording, and verification before anything goes public.</p>
          </div>
          <div>
            <p className="font-semibold text-slate-900">3. Memorial details can grow later</p>
            <p>A brief death notice can grow into a fuller memorial page over time. Once the core record is approved by staff, it will be published.</p>
          </div>
        </div>
      </section>

      <div className="rounded-xl border border-blue-200 bg-[var(--article-card-badge-bg)] px-4 py-3 text-sm text-blue-900">
        Memoriam is not an open comment space. Community memories, photos, and stewardship features are handled separately and remain moderated.
      </div>

      <FormCard>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-800">Submission type</span>
              <select
                name="submissionType"
                value={form.submissionType}
                onChange={updateForm}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              >
                <option value="DEATH_NOTICE">Death notice</option>
                <option value="MEMORIAL_PAGE">Memorial page</option>
                <option value="PRIVATE_REQUEST">Private request</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-800">Memoriam category</span>
              <select
                name="categoryId"
                value={form.categoryId}
                onChange={updateForm}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              >
                <option value="">Unassigned for now</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.parentCategory?.name ? `${category.parentCategory.name} / ` : ''}
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-800">Full name of the deceased</span>
              <input
                name="fullName"
                value={form.fullName}
                onChange={updateForm}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                placeholder="Full legal or commonly used name"
                required
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-800">Preferred name</span>
              <input
                name="preferredName"
                value={form.preferredName}
                onChange={updateForm}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                placeholder="Nickname or name commonly used"
              />
            </label>
          </div>

          {/* Dates + auto-computed age */}
          <div className="grid gap-4 md:grid-cols-4">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-800">Birth date</span>
              <input
                name="birthDate"
                type="date"
                value={form.birthDate}
                onChange={updateForm}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-800">Death date</span>
              <input
                name="deathDate"
                type="date"
                value={form.deathDate}
                onChange={updateForm}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              />
            </label>

            <div className="space-y-2">
              <span className="text-sm font-semibold text-slate-800">Age at death</span>
              <div className="flex h-[46px] items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-500">
                {computedAge !== null ? (
                  <span className="font-medium text-slate-900">{computedAge}</span>
                ) : (
                  <span className="italic">Calculated from dates</span>
                )}
              </div>
            </div>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-800">Community connection</span>
              <input
                name="townName"
                value={form.townName}
                onChange={updateForm}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                placeholder="Town, borough, township"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-800">Birth town</span>
              <input
                name="birthTownName"
                value={form.birthTownName}
                onChange={updateForm}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-800">Death town</span>
              <input
                name="deathTownName"
                value={form.deathTownName}
                onChange={updateForm}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-800">Your relationship</span>
              <select
                name="relationshipToDeceased"
                value={form.relationshipToDeceased}
                onChange={updateForm}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                required
              >
                <option value="">Select one</option>
                {RELATIONSHIP_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-800">Working page title</span>
              <input
                name="title"
                value={form.title}
                onChange={updateForm}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                placeholder="Optional if staff should title it from the factual record"
              />
            </label>
          </div>

          {/* Factual — 1 000-char limit */}
          <div className="space-y-2">
            <span className="text-sm font-semibold text-slate-800">Factual</span>
            <div className="relative">
              <textarea
                name="summary"
                value={form.summary}
                onChange={updateForm}
                rows={5}
                maxLength={SUMMARY_LIMIT}
                className="w-full rounded-[24px] border border-slate-300 bg-white px-4 py-3 pb-7 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                placeholder="Share the core notice, service information, or the factual overview staff should review first."
                required
              />
              <span
                className={`absolute bottom-3 right-4 text-xs ${
                  form.summary.length >= SUMMARY_LIMIT
                    ? 'font-semibold text-red-600'
                    : form.summary.length >= SUMMARY_LIMIT * 0.9
                    ? 'text-amber-600'
                    : 'text-slate-400'
                }`}
              >
                {form.summary.length} / {SUMMARY_LIMIT}
              </span>
            </div>
            {form.summary.length >= SUMMARY_LIMIT && (
              <p className="text-xs text-red-600">
                Character limit reached. Please shorten the text before submitting.
              </p>
            )}
          </div>

          {/* Short memorial — 300-char limit */}
          <div className="space-y-2">
            <span className="text-sm font-semibold text-slate-800">Short memorial</span>
            <div className="relative">
              <textarea
                name="shortSummary"
                value={form.shortSummary}
                onChange={updateForm}
                rows={3}
                maxLength={SHORT_SUMMARY_LIMIT}
                className="w-full rounded-[24px] border border-slate-300 bg-white px-4 py-3 pb-7 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                placeholder="Optional one or two sentences shown on the memorial page itself"
              />
              <span
                className={`absolute bottom-3 right-4 text-xs ${
                  form.shortSummary.length >= SHORT_SUMMARY_LIMIT
                    ? 'font-semibold text-red-600'
                    : form.shortSummary.length >= SHORT_SUMMARY_LIMIT * 0.9
                    ? 'text-amber-600'
                    : 'text-slate-400'
                }`}
              >
                {form.shortSummary.length} / {SHORT_SUMMARY_LIMIT}
              </span>
            </div>
            {form.shortSummary.length >= SHORT_SUMMARY_LIMIT && (
              <p className="text-xs text-red-600">
                Character limit reached. Please shorten the text before submitting.
              </p>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-800">Biography</span>
              <textarea
                name="biography"
                value={form.biography}
                onChange={updateForm}
                rows={6}
                className="w-full rounded-[24px] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                placeholder="Basic biography, affiliations, and facts"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-800">Life story</span>
              <textarea
                name="lifeStory"
                value={form.lifeStory}
                onChange={updateForm}
                rows={6}
                className="w-full rounded-[24px] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                placeholder="Longer memorial writing, if you have it"
              />
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-800">Service details</span>
              <textarea
                name="serviceDetails"
                value={form.serviceDetails}
                onChange={updateForm}
                rows={4}
                className="w-full rounded-[24px] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                placeholder="Visitation, funeral, cemetery, or memorial service details"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-800">Family details</span>
              <textarea
                name="familyDetails"
                value={form.familyDetails}
                onChange={updateForm}
                rows={4}
                className="w-full rounded-[24px] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                placeholder="Immediate family, surviving relatives, or other careful family context"
              />
            </label>
          </div>

          <div className="space-y-2">
            <span className="text-sm font-semibold text-slate-800">Where this information comes from</span>
            <p className="text-xs leading-5 text-slate-500">
              Tell us how you know this — for example: submitted by the family, shared by the funeral home, or taken from a printed notice. This helps staff verify the record.
            </p>
            <textarea
              name="sourceNote"
              value={form.sourceNote}
              onChange={updateForm}
              rows={3}
              className="w-full rounded-[24px] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              placeholder="e.g. submitted by daughter, based on funeral home notice, reviewed with family"
            />
          </div>

          {/* Photos */}
          <section className="space-y-4 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Photos</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Upload photos to include with this submission. The first photo will be used as the hero image. Staff reviews all photos before the memorial is published.
              </p>
            </div>
            <ImageUpload
              context="memoriam"
              maxFiles={20}
              value={photos.map((p) => p.imageUrl)}
              onUpload={(img) =>
                setPhotos((current) => [...current, { imageUrl: img.url, caption: '' }])
              }
              onRemove={(url) =>
                setPhotos((current) => current.filter((p) => p.imageUrl !== url))
              }
              helperText="JPG, PNG, or WebP — up to 5 MB per photo"
            />
            {photos.length > 0 && (
              <div className="space-y-2">
                {photos.map((photo, index) => (
                  <div key={photo.imageUrl} className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.imageUrl}
                      alt=""
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                    <input
                      type="text"
                      value={photo.caption}
                      onChange={(e) =>
                        setPhotos((current) =>
                          current.map((p, i) =>
                            i === index ? { ...p, caption: e.target.value } : p
                          )
                        )
                      }
                      className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                      placeholder={`Caption for photo ${index + 1} (optional)`}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Videos */}
          <section className="space-y-4 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Videos</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Add YouTube or Vimeo tribute videos, or a link to a recorded or live memorial service.
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-800">YouTube / Vimeo links</p>
              {videoUrls.map((url, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) =>
                      setVideoUrls((current) =>
                        current.map((u, i) => (i === index ? e.target.value : u))
                      )
                    }
                    className="flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                    placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
                  />
                  {videoUrls.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setVideoUrls((current) => current.filter((_, i) => i !== index))
                      }
                      className="rounded-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-white"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              {videoUrls.length < 5 && (
                <button
                  type="button"
                  onClick={() => setVideoUrls((current) => [...current, ''])}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white"
                >
                  Add another video
                </button>
              )}
            </div>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-800">Memorial service link</span>
              <p className="text-xs leading-5 text-slate-500">
                A link to a funeral home stream, church livestream, or recording — this will appear as a plain link, not an embed.
              </p>
              <input
                type="url"
                value={serviceStreamUrl}
                onChange={(e) => setServiceStreamUrl(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                placeholder="https://..."
              />
            </label>
          </section>

          <section className="space-y-4 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Verification contacts</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Add anyone staff can contact to confirm the record. Leave blank if you do not have this yet, but include it whenever possible.
              </p>
            </div>

            {verifications.map((verification, index) => (
              <div key={`${verification.verifierName}-${index}`} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">Verification contact {index + 1}</p>
                  {verifications.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeVerificationRow(index)}
                      className="text-sm font-medium text-slate-500 transition hover:text-slate-900"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-slate-800">Role</span>
                    <select
                      name="verificationRole"
                      value={verification.verificationRole}
                      onChange={(event) => updateVerification(index, event)}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                    >
                      {VERIFICATION_ROLE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {formatVerificationLabel(option)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-slate-800">Verifier name</span>
                    <input
                      name="verifierName"
                      value={verification.verifierName}
                      onChange={(event) => updateVerification(index, event)}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                    />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-slate-800">Organization</span>
                    <input
                      name="verifierOrganization"
                      value={verification.verifierOrganization}
                      onChange={(event) => updateVerification(index, event)}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-slate-800">Contact</span>
                    <input
                      name="verifierContact"
                      value={verification.verifierContact}
                      onChange={(event) => updateVerification(index, event)}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                      placeholder="Email, phone, or best contact path"
                    />
                  </label>
                </div>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-800">Note</span>
                  <textarea
                    name="note"
                    value={verification.note}
                    onChange={(event) => updateVerification(index, event)}
                    rows={3}
                    className="w-full rounded-[24px] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                    placeholder="How this person or institution relates to the record"
                  />
                </label>
              </div>
            ))}

            {verifications.length < 5 ? (
              <button
                type="button"
                onClick={addVerificationRow}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white"
              >
                Add verification contact
              </button>
            ) : null}
          </section>

          <section className="space-y-4 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Submitter contact</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Staff may need to follow up about names, dates, service details, or family approval.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-800">Your name</span>
                <input
                  name="requesterName"
                  value={form.requesterName}
                  onChange={updateForm}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                  placeholder={currentUser?.name || ''}
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-800">Email</span>
                <input
                  name="requesterEmail"
                  type="email"
                  value={form.requesterEmail}
                  onChange={updateForm}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                  placeholder={currentUser?.email || ''}
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-800">Phone</span>
                <input
                  name="requesterPhone"
                  value={form.requesterPhone}
                  onChange={updateForm}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                />
              </label>
            </div>
          </section>

          {error ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          {success ? (
            <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </p>
          ) : null}

          <FormCardActions className="justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Submitting...' : 'Submit For Review'}
            </button>
          </FormCardActions>
        </form>
      </FormCard>
    </div>
  );
}
