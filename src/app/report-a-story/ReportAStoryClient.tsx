'use client';

import { FormEvent, useState } from 'react';
import InternalPageHeader from '@/components/shared/InternalPageHeader';
import FormCard, { FormCardActions } from '@/components/shared/FormCard';

interface ReportAStoryFormState {
  topic: string;
  whatHappened: string;
  whoIsInvolved: string;
  whereDidItHappen: string;
  whenDidItHappen: string;
  whyItMatters: string;
  supportingLinks: string;
  notes: string;
  requesterName: string;
  requesterEmail: string;
  requesterPhone: string;
}

const EMPTY_FORM: ReportAStoryFormState = {
  topic: '',
  whatHappened: '',
  whoIsInvolved: '',
  whereDidItHappen: '',
  whenDidItHappen: '',
  whyItMatters: '',
  supportingLinks: '',
  notes: '',
  requesterName: '',
  requesterEmail: '',
  requesterPhone: '',
};

export default function ReportAStoryClient() {
  const [form, setForm] = useState<ReportAStoryFormState>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!form.topic.trim() && !form.whatHappened.trim()) {
      setError('Add a topic or a short description of what happened.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/reporter/runs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...form,
          supportingLinks: form.supportingLinks
            .split('\n')
            .map((value) => value.trim())
            .filter(Boolean),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit story request');
      }

      setForm(EMPTY_FORM);
      setSuccess('Story request submitted. Our team can now review the run internally.');
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Failed to submit story request'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <InternalPageHeader
        title="Report A Story"
        description="Share a story tip, article request, or local issue that deserves reporting attention."
        mobileAlign="start"
      />

      <FormCard>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-800">Topic</span>
              <input
                name="topic"
                value={form.topic}
                onChange={handleChange}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                placeholder="What is this about?"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-800">Who Is Involved</span>
              <input
                name="whoIsInvolved"
                value={form.whoIsInvolved}
                onChange={handleChange}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                placeholder="People, groups, or organizations"
              />
            </label>
          </div>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-800">What Happened</span>
            <textarea
              name="whatHappened"
              value={form.whatHappened}
              onChange={handleChange}
              rows={6}
              className="w-full rounded-[24px] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              placeholder="Describe the story, event, issue, or development."
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-800">Where Did It Happen</span>
              <input
                name="whereDidItHappen"
                value={form.whereDidItHappen}
                onChange={handleChange}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                placeholder="Town, place, venue, or area"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-800">When Did It Happen</span>
              <input
                name="whenDidItHappen"
                value={form.whenDidItHappen}
                onChange={handleChange}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                placeholder="Date, time, or timeframe"
              />
            </label>
          </div>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-800">Why It Matters</span>
            <textarea
              name="whyItMatters"
              value={form.whyItMatters}
              onChange={handleChange}
              rows={4}
              className="w-full rounded-[24px] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              placeholder="Why should readers care?"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-800">Supporting Links</span>
            <textarea
              name="supportingLinks"
              value={form.supportingLinks}
              onChange={handleChange}
              rows={4}
              className="w-full rounded-[24px] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              placeholder="One URL per line"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-800">Additional Notes</span>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={4}
              className="w-full rounded-[24px] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              placeholder="Anything else the reporting team should know?"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-800">Your Name</span>
              <input
                name="requesterName"
                value={form.requesterName}
                onChange={handleChange}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                placeholder="Optional if signed in"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-800">Email</span>
              <input
                name="requesterEmail"
                type="email"
                value={form.requesterEmail}
                onChange={handleChange}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                placeholder="How we can follow up"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-800">Phone</span>
              <input
                name="requesterPhone"
                value={form.requesterPhone}
                onChange={handleChange}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                placeholder="Optional"
              />
            </label>
          </div>

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
              {isSubmitting ? 'Submitting...' : 'Submit Story Request'}
            </button>
          </FormCardActions>
        </form>
      </FormCard>
    </div>
  );
}
