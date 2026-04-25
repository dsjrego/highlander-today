'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useSession } from 'next-auth/react';
import FormCard, { FormCardActions } from '@/components/shared/FormCard';
import InternalPageHeader from '@/components/shared/InternalPageHeader';
import { hasTrustedAccess } from '@/lib/trust-access';

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

type MemoriamFormState = {
  submissionType: 'DEATH_NOTICE' | 'MEMORIAL_PAGE' | 'PRIVATE_REQUEST';
  categoryId: string;
  relationshipToDeceased: string;
  requesterName: string;
  requesterEmail: string;
  requesterPhone: string;
  fullName: string;
  preferredName: string;
  age: string;
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
  provenanceNote: string;
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
  age: '',
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
  provenanceNote: '',
};

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
      setError('Add a short factual summary so staff can review the submission.');
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
            age: form.age ? Number(form.age) : undefined,
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
            provenanceNote: form.provenanceNote || undefined,
            categoryId: form.categoryId || undefined,
          },
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
        description="Start a death notice or memorial page request for careful staff review."
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
            <p>A narrow death notice can be extended into a fuller memorial over time, but the core factual record stays under review.</p>
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

          <div className="grid gap-4 md:grid-cols-4">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-800">Age</span>
              <input
                name="age"
                type="number"
                min="0"
                max="130"
                value={form.age}
                onChange={updateForm}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              />
            </label>

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

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-800">Factual summary</span>
            <textarea
              name="summary"
              value={form.summary}
              onChange={updateForm}
              rows={5}
              className="w-full rounded-[24px] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              placeholder="Share the core notice, service information, or the factual summary staff should review first."
              required
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-800">Short memorial summary</span>
            <textarea
              name="shortSummary"
              value={form.shortSummary}
              onChange={updateForm}
              rows={3}
              className="w-full rounded-[24px] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              placeholder="Optional short summary for the memorial page itself"
            />
          </label>

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

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-800">Provenance note</span>
            <textarea
              name="provenanceNote"
              value={form.provenanceNote}
              onChange={updateForm}
              rows={3}
              className="w-full rounded-[24px] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              placeholder="Example: submitted by daughter, based on funeral home notice, reviewed with family"
            />
          </label>

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
