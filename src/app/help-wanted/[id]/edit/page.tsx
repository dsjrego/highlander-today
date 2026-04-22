'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import FormCard from '@/components/shared/FormCard';
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
    return <div className="rounded-[28px] border border-white/10 bg-white/70 p-8 text-center text-slate-500 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">Loading post...</div>;
  }

  if (error && !post) {
    return <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>;
  }

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(145deg,rgba(143,29,44,0.96),rgba(10,32,51,0.94))] px-6 py-8 text-white shadow-[0_35px_80px_rgba(7,17,26,0.22)] md:px-10 md:py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-100/74">
            Help Wanted
          </p>
          <h1 className="mt-4 text-4xl font-black leading-[0.95] tracking-[-0.05em] md:text-6xl">Edit your post</h1>
          <p className="mt-4 text-base leading-8 text-white/78 md:text-lg">
            Update the post and return to your Help Wanted dashboard.
          </p>
        </div>
        <Link
          href="/help-wanted/manage"
          className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 font-semibold text-slate-950"
        >
          Back to My Posts
        </Link>
      </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl border border-blue-200 bg-[var(--article-card-badge-bg)] px-4 py-3 text-sm text-blue-900">
        Editing lets you improve clarity before resubmitting or reusing the post. Keep response details on-platform and avoid public phone numbers or email addresses in the text or image.
      </div>

      <FormCard>
        <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Current Status
            </label>
            <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700">
              {post?.status.replace('_', ' ')}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Draft and rejected posts can be revised before resubmission. Published posts stay managed from your dashboard.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Posting Type
            </label>
            <select
              name="postingType"
              value={formData.postingType}
              onChange={handleInputChange}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
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
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Title
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={6}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
          />
          <p className="mt-2 text-xs text-slate-500">
            Include the work, timing, local context, compensation, and what a responder should know before opening a message thread.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Compensation Type
            </label>
            <select
              name="compensationType"
              value={formData.compensationType}
              onChange={handleInputChange}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            >
              {COMPENSATION_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Compensation Details
            </label>
            <input
              type="text"
              name="compensationText"
              value={formData.compensationText}
              onChange={handleInputChange}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Location
            </label>
            <input
              type="text"
              name="locationText"
              value={formData.locationText}
              onChange={handleInputChange}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Schedule / Timing
            </label>
            <input
              type="text"
              name="scheduleText"
              value={formData.scheduleText}
              onChange={handleInputChange}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Optional Closing Date
          </label>
          <input
            type="date"
            name="expiresAt"
            value={formData.expiresAt}
            onChange={handleInputChange}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] md:w-auto"
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
            className="flex-1 rounded-xl bg-slate-950 py-3 font-bold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/help-wanted/manage')}
            className="flex-1 rounded-xl border border-slate-300 py-3 font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
        </form>
      </FormCard>
    </div>
  );
}
