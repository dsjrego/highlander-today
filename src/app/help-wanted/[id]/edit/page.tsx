'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ImageUpload from '@/components/shared/ImageUpload';

interface HelpWantedDetail {
  id: string;
  title: string;
  description: string;
  postingType: 'EMPLOYMENT' | 'SERVICE_REQUEST' | 'GIG_TASK';
  compensationType: string | null;
  compensationText: string | null;
  locationText: string | null;
  scheduleText: string | null;
  photoUrl: string | null;
  status: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'FILLED' | 'CLOSED' | 'REJECTED';
  expiresAt: string | null;
}

interface PageProps {
  params: {
    id: string;
  };
}

const POSTING_TYPE_OPTIONS = [
  { value: 'EMPLOYMENT', label: 'Employment' },
  { value: 'SERVICE_REQUEST', label: 'Service Request' },
  { value: 'GIG_TASK', label: 'Gig / Task' },
] as const;

const COMPENSATION_TYPE_OPTIONS = [
  { value: 'UNSPECIFIED', label: 'Unspecified' },
  { value: 'HOURLY', label: 'Hourly' },
  { value: 'SALARY', label: 'Salary' },
  { value: 'FIXED', label: 'Fixed amount' },
  { value: 'NEGOTIABLE', label: 'Negotiable' },
  { value: 'VOLUNTEER', label: 'Volunteer' },
] as const;

export default function EditHelpWantedPage({ params }: PageProps) {
  const router = useRouter();
  const [post, setPost] = useState<HelpWantedDetail | null>(null);
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
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchPost() {
      setIsLoading(true);
      setError('');

      try {
        const res = await fetch(`/api/help-wanted/${params.id}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to load post');
        }

        setPost(data);
        setFormData({
          title: data.title || '',
          description: data.description || '',
          postingType: data.postingType || 'EMPLOYMENT',
          compensationType: data.compensationType || 'UNSPECIFIED',
          compensationText: data.compensationText || '',
          locationText: data.locationText || '',
          scheduleText: data.scheduleText || '',
          expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString().slice(0, 10) : '',
          photoUrl: data.photoUrl || '',
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load post');
      } finally {
        setIsLoading(false);
      }
    }

    fetchPost();
  }, [params.id]);

  function handleInputChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!formData.title.trim()) {
      setError('Title is required.');
      return;
    }

    if (!formData.description.trim() || formData.description.trim().length < 20) {
      setError('Description must be at least 20 characters.');
      return;
    }

    setIsSaving(true);

    try {
      const res = await fetch(`/api/help-wanted/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          postingType: formData.postingType,
          compensationType: formData.compensationType || undefined,
          compensationText: formData.compensationText || null,
          locationText: formData.locationText || null,
          scheduleText: formData.scheduleText || null,
          expiresAt: formData.expiresAt ? new Date(`${formData.expiresAt}T23:59:59`).toISOString() : null,
          photoUrl: formData.photoUrl || null,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        const validationMessage = Array.isArray(data.details)
          ? data.details
              .map((detail: { message?: string }) => detail.message)
              .filter(Boolean)
              .join(', ')
          : '';
        throw new Error(validationMessage || data.error || 'Failed to update post');
      }

      router.push('/help-wanted/manage');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update post');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">Loading post...</div>;
  }

  if (error && !post) {
    return <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>;
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-8 pb-3 border-b-2" style={{ borderColor: '#A51E30' }}>
        <div>
          <h1 className="text-2xl font-bold">Edit Help Wanted Post</h1>
          <p className="text-sm text-gray-500 mt-1">
            Update the post and return to your Help Wanted dashboard.
          </p>
        </div>
        <Link
          href="/help-wanted/manage"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-gray-100 text-gray-800 font-semibold"
        >
          Back to My Posts
        </Link>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      ) : null}

      <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-xl px-4 py-3 mb-6 text-sm">
        Editing lets you improve clarity before resubmitting or reusing the post. Keep response details on-platform and avoid public phone numbers or email addresses in the text or image.
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Current Status
            </label>
            <div className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
              {post?.status.replace('_', ' ')}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Draft and rejected posts can be revised before resubmission. Published posts stay managed from your dashboard.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Posting Type
            </label>
            <select
              name="postingType"
              value={formData.postingType}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
            >
              {POSTING_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Title
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={6}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
          />
          <p className="mt-2 text-xs text-gray-500">
            Include the work, timing, local context, compensation, and what a responder should know before opening a message thread.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
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
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Compensation Details
            </label>
            <input
              type="text"
              name="compensationText"
              value={formData.compensationText}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Location
            </label>
            <input
              type="text"
              name="locationText"
              value={formData.locationText}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Schedule / Timing
            </label>
            <input
              type="text"
              name="scheduleText"
              value={formData.scheduleText}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
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
          onUpload={(image) => setFormData((prev) => ({ ...prev, photoUrl: image.url }))}
          onRemove={() => setFormData((prev) => ({ ...prev, photoUrl: '' }))}
          label="Photo"
          helperText="Optional image for the opportunity. Avoid images containing contact details."
        />

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            type="submit"
            disabled={isSaving}
            className="flex-1 bg-[#46A8CC] text-white font-bold py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/help-wanted/manage')}
            className="flex-1 border border-gray-300 text-gray-700 font-bold py-2 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
