'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import ImageUpload from '@/components/shared/ImageUpload';

const POSTING_TYPE_OPTIONS = [
  {
    value: 'EMPLOYMENT',
    label: 'Employment',
    description: 'Standard job openings from businesses or organizations.',
  },
  {
    value: 'SERVICE_REQUEST',
    label: 'Service Request',
    description: 'A local request for help or a service provider.',
  },
  {
    value: 'GIG_TASK',
    label: 'Gig / Task',
    description: 'Short-term, bounded work that can be completed as a task.',
  },
] as const;

const COMPENSATION_TYPE_OPTIONS = [
  { value: 'UNSPECIFIED', label: 'Unspecified' },
  { value: 'HOURLY', label: 'Hourly' },
  { value: 'SALARY', label: 'Salary' },
  { value: 'FIXED', label: 'Fixed amount' },
  { value: 'NEGOTIABLE', label: 'Negotiable' },
  { value: 'VOLUNTEER', label: 'Volunteer' },
] as const;

export default function SubmitHelpWantedPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    postingType: 'EMPLOYMENT',
    compensationType: 'UNSPECIFIED',
    compensationText: '',
    locationText: '',
    scheduleText: '',
    expiresAt: '',
    photoUrl: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isTrusted =
    sessionStatus === 'authenticated' &&
    (session?.user as { trust_level?: string } | undefined)?.trust_level === 'TRUSTED';

  function handleInputChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    if (!isTrusted) {
      setError('Trusted membership is required to post to Help Wanted.');
      return;
    }

    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    if (!formData.description.trim() || formData.description.trim().length < 20) {
      setError('Description must be at least 20 characters');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/help-wanted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          postingType: formData.postingType,
          compensationType: formData.compensationType || undefined,
          compensationText: formData.compensationText || undefined,
          locationText: formData.locationText || undefined,
          scheduleText: formData.scheduleText || undefined,
          expiresAt: formData.expiresAt ? new Date(`${formData.expiresAt}T23:59:59`).toISOString() : undefined,
          photoUrl: formData.photoUrl || undefined,
          status: 'PENDING_REVIEW',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        const validationMessage = Array.isArray(data.details)
          ? data.details
              .map((detail: { message?: string }) => detail.message)
              .filter(Boolean)
              .join(', ')
          : '';
        setError(validationMessage || data.error || 'Failed to submit post');
      } else {
        const data = await res.json();
        router.push(`/help-wanted/${data.id}`);
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  if (sessionStatus === 'loading') {
    return <div className="flex justify-center items-center py-20 text-gray-500">Loading...</div>;
  }

  if (sessionStatus !== 'authenticated') {
    return (
      <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-xl px-5 py-4">
        Sign in with a trusted account to post a Help Wanted opportunity.
      </div>
    );
  }

  if (!isTrusted) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-900 rounded-xl px-5 py-4">
        Trusted membership is required before you can post to Help Wanted.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-8 pb-3 border-b-2" style={{ borderColor: '#A51E30' }}>
        <div>
          <h1 className="text-2xl font-bold">Post to Help Wanted</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create a local opportunity for jobs, services, or short-term task work. Posts are reviewed before publication.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/help-wanted/manage')}
          className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-full hover:bg-gray-200 transition"
        >
          My Posts
        </button>
      </div>

      {error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      ) : null}

      <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-xl px-4 py-3 mb-6 text-sm">
        To preserve accountability, responses stay inside Highlander Today messaging. Do not include public phone numbers or email addresses in the post body.
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">What happens next</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
          <div>
            <p className="font-semibold text-gray-900 mb-1">1. Submit for review</p>
            <p>Staff checks that the opportunity is local, clear, and appropriate for the community.</p>
          </div>
          <div>
            <p className="font-semibold text-gray-900 mb-1">2. Publish and receive responses</p>
            <p>Once approved, trusted users can respond through Messages instead of off-platform contact info.</p>
          </div>
          <div>
            <p className="font-semibold text-gray-900 mb-1">3. Mark it resolved</p>
            <p>When the role or task is handled, update the post to filled or closed from your dashboard.</p>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 md:p-8 rounded-xl border border-gray-200 shadow-sm space-y-6"
      >
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Posting Type *
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {POSTING_TYPE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`rounded-xl border p-4 cursor-pointer transition ${
                  formData.postingType === option.value
                    ? 'border-[#46A8CC] bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="postingType"
                  value={option.value}
                  checked={formData.postingType === option.value}
                  onChange={handleInputChange}
                  className="sr-only"
                />
                <p className="font-semibold text-gray-900">{option.label}</p>
                <p className="text-sm text-gray-500 mt-1">{option.description}</p>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Title *
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
            placeholder="Need a weekend cashier, looking for gutter repair, moving help needed..."
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Description *
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
            rows={6}
            placeholder="Explain the work, expectations, timing, and what kind of person or provider you are looking for."
          />
          <p className="mt-2 text-xs text-gray-500">
            Strong posts usually mention the work itself, timing, location, compensation, and anything responders should know before messaging.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Compensation Type
            </label>
            <select
              name="compensationType"
              value={formData.compensationType}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
            >
              {COMPENSATION_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Compensation Details
            </label>
            <input
              type="text"
              name="compensationText"
              value={formData.compensationText}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
              placeholder="$20/hour, salary based on experience, flat $150, etc."
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Location
            </label>
            <input
              type="text"
              name="locationText"
              value={formData.locationText}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
              placeholder="Cambria Heights, in-home, remote, local storefront, etc."
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Schedule / Timing
            </label>
            <input
              type="text"
              name="scheduleText"
              value={formData.scheduleText}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
              placeholder="Weekdays, evenings, one-time weekend task, ASAP, etc."
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Optional Closing Date
          </label>
          <input
            type="date"
            name="expiresAt"
            value={formData.expiresAt}
            onChange={handleInputChange}
            className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
          />
        </div>

        <ImageUpload
          context="help-wanted"
          maxFiles={1}
          value={formData.photoUrl ? [formData.photoUrl] : []}
          onUpload={(image) =>
            setFormData((prev) => ({ ...prev, photoUrl: image.url }))
          }
          onRemove={() =>
            setFormData((prev) => ({ ...prev, photoUrl: '' }))
          }
          label="Photo"
          helperText="Optional image for the opportunity. Avoid including phone numbers or email addresses in the image."
        />

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-[#46A8CC] text-white font-bold py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {isLoading ? 'Submitting...' : 'Submit for Review'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/help-wanted')}
            className="flex-1 border border-gray-300 text-gray-700 font-bold py-2 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
