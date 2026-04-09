'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Trash2 } from 'lucide-react';
import ImageUpload from '@/components/shared/ImageUpload';
import { CrudActionButton } from '@/components/shared/CrudAction';
import { formatEventDateInput, formatEventTimeInput } from '@/lib/event-datetime';
import { formatLocationPrimary, formatLocationSecondary } from '@/lib/location-format';

const SERIES_SCOPE_OPTIONS = [
  { value: 'SINGLE', label: 'This event only' },
  { value: 'FUTURE', label: 'This and future events' },
  { value: 'SERIES', label: 'Entire series' },
] as const;

const SERIES_CADENCE_OPTIONS = [
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY_DATE', label: 'Monthly on date' },
  { value: 'MONTHLY_WEEKDAY', label: 'Monthly on weekday' },
] as const;

type SeriesEditScope = (typeof SERIES_SCOPE_OPTIONS)[number]['value'];
type SeriesCadence = (typeof SERIES_CADENCE_OPTIONS)[number]['value'];

interface EditableEvent {
  id: string;
  title: string;
  description: string | null;
  startDatetime: string;
  endDatetime: string | null;
  venueLabel: string | null;
  photoUrl: string | null;
  costText: string | null;
  contactInfo: string | null;
  status: 'PENDING_REVIEW' | 'PUBLISHED' | 'UNPUBLISHED';
  seriesId: string | null;
  seriesPosition: number | null;
  seriesCount: number | null;
  recurrenceCadence: SeriesCadence | null;
  locationId: string;
}

interface LocationOption {
  id: string;
  name: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string | null;
}

interface AdminEventEditorProps {
  event: EditableEvent;
  locations: LocationOption[];
}

interface FormState {
  title: string;
  description: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  locationId: string;
  venueLabel: string;
  imageUrl: string;
  costText: string;
  contactInfo: string;
  status: EditableEvent['status'];
  recurrenceCadence: SeriesCadence;
}

function buildInitialForm(event: EditableEvent): FormState {
  return {
    title: event.title,
    description: event.description || '',
    startDate: formatEventDateInput(event.startDatetime),
    startTime: formatEventTimeInput(event.startDatetime) || '',
    endDate: formatEventDateInput(event.endDatetime),
    endTime: formatEventTimeInput(event.endDatetime) || '',
    locationId: event.locationId,
    venueLabel: event.venueLabel || '',
    imageUrl: event.photoUrl || '',
    costText: event.costText || '',
    contactInfo: event.contactInfo || '',
    status: event.status,
    recurrenceCadence: event.recurrenceCadence || 'WEEKLY',
  };
}

export default function AdminEventEditor({ event, locations }: AdminEventEditorProps) {
  const router = useRouter();
  const initialForm = buildInitialForm(event);
  const [form, setForm] = useState<FormState>(() => initialForm);
  const [seriesEditScope, setSeriesEditScope] = useState<SeriesEditScope>('SINGLE');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const canEditSeriesCadence = Boolean(event.seriesId && seriesEditScope !== 'SINGLE');
  const isFutureSeriesEdit = event.seriesId && seriesEditScope === 'FUTURE';
  const isWholeSeriesEdit = event.seriesId && seriesEditScope === 'SERIES';

  function handleInputChange(
    nextEvent: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = nextEvent.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(nextEvent: FormEvent<HTMLFormElement>) {
    nextEvent.preventDefault();
    setError('');
    setSuccess('');
    setIsSaving(true);

    try {
      const body: Record<string, string | null> = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        locationId: form.locationId,
        venueLabel: form.venueLabel.trim() || null,
        imageUrl: form.imageUrl.trim() || null,
        costText: form.costText.trim() || null,
        contactInfo: form.contactInfo.trim() || null,
        status: form.status,
      };

      if (event.seriesId) {
        body.seriesEditScope = seriesEditScope;
      }

      if (form.startDate !== initialForm.startDate) {
        body.startDate = form.startDate;
      }
      if (form.endDate !== initialForm.endDate) {
        body.endDate = form.endDate || null;
      }

      if (form.startTime !== initialForm.startTime) {
        body.startTime = form.startTime || null;
      }
      if (form.endTime !== initialForm.endTime) {
        body.endTime = form.endTime || null;
      }

      if (canEditSeriesCadence && form.recurrenceCadence !== initialForm.recurrenceCadence) {
        body.recurrenceCadence = form.recurrenceCadence;
      }

      const response = await fetch(`/api/events/${event.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save event');
      }

      setSuccess(
        data.affectedEventCount > 1
          ? `Saved changes across ${data.affectedEventCount} events.`
          : 'Saved changes.'
      );
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save event');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    const scopeLabel =
      seriesEditScope === 'FUTURE'
        ? 'this event and all future events in the series'
        : seriesEditScope === 'SERIES'
          ? 'every event in this series'
          : 'this event';
    const confirmed = window.confirm(`Delete ${scopeLabel}? This cannot be undone.`);

    if (!confirmed) {
      return;
    }

    setError('');
    setSuccess('');
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/events/${event.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event.seriesId ? { seriesEditScope } : {}),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete event');
      }

      router.push('/admin/events');
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete event');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Edit Event</p>
          <p className="text-sm text-slate-600">
            Update event details here. Recurring events can regenerate their schedule when you edit future sessions or
            the whole series.
          </p>
          {event.seriesId ? (
            <p className="text-xs text-slate-500">
              Session {event.seriesPosition} of {event.seriesCount}
            </p>
          ) : null}
        </div>

        {error ? <div className="admin-list-error">{error}</div> : null}
        {success ? (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        ) : null}

        {event.seriesId ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <label className="form-label">Apply changes to</label>
            <select
              name="seriesEditScope"
              value={seriesEditScope}
              onChange={(nextEvent) => setSeriesEditScope(nextEvent.target.value as SeriesEditScope)}
              className="form-input border-slate-300 bg-white text-slate-950"
            >
              {SERIES_SCOPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {isFutureSeriesEdit ? (
              <p className="mt-2 text-xs text-slate-500">
                Date, time, and cadence edits from this point forward will branch into a new recurring series starting
                with this session.
              </p>
            ) : null}
            {isWholeSeriesEdit ? (
              <p className="mt-2 text-xs text-slate-500">
                Date, time, and cadence edits will regenerate every session in this series from the updated start.
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div>
            <ImageUpload
              context="event"
              maxFiles={1}
              singleCard
              value={form.imageUrl ? [form.imageUrl] : []}
              onUpload={(image) =>
                setForm((current) => ({
                  ...current,
                  imageUrl: image.url,
                }))
              }
              onRemove={() =>
                setForm((current) => ({
                  ...current,
                  imageUrl: '',
                }))
              }
              label="Event Photo"
              labelClassName="form-label"
              helperText="Optional hero-style image."
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="form-label">Event Title</label>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleInputChange}
                className="form-input border-slate-300 bg-white text-slate-950"
              />
            </div>

            <div>
              <label className="form-label">Status</label>
              <select
                name="status"
                value={form.status}
                onChange={handleInputChange}
                className="form-input border-slate-300 bg-white text-slate-950"
              >
                <option value="PUBLISHED">Approved</option>
                <option value="PENDING_REVIEW">Pending</option>
                <option value="UNPUBLISHED">Archived</option>
              </select>
            </div>

            <div>
              <label className="form-label">Start Date</label>
              <input
                type="date"
                name="startDate"
                value={form.startDate}
                onChange={handleInputChange}
                className="form-input border-slate-300 bg-white text-slate-950"
              />
            </div>

            <div>
              <label className="form-label">Start Time</label>
              <input
                type="time"
                name="startTime"
                value={form.startTime}
                onChange={handleInputChange}
                className="form-input border-slate-300 bg-white text-slate-950"
              />
              {canEditSeriesCadence ? (
                <p className="mt-1 text-xs text-slate-500">Applies this clock time to each selected occurrence.</p>
              ) : null}
            </div>

            <div>
              <label className="form-label">End Date</label>
              <input
                type="date"
                name="endDate"
                value={form.endDate}
                onChange={handleInputChange}
                className="form-input border-slate-300 bg-white text-slate-950"
              />
            </div>

            <div>
              <label className="form-label">End Time</label>
              <input
                type="time"
                name="endTime"
                value={form.endTime}
                onChange={handleInputChange}
                className="form-input border-slate-300 bg-white text-slate-950"
              />
              {canEditSeriesCadence ? (
                <p className="mt-1 text-xs text-slate-500">
                  Keeps each occurrence on its current day and updates only the ending clock time.
                </p>
              ) : null}
            </div>

            {event.seriesId ? (
              <div className="lg:col-span-2">
                <label className="form-label">Recurrence cadence</label>
                <select
                  name="recurrenceCadence"
                  value={form.recurrenceCadence}
                  onChange={handleInputChange}
                  disabled={!canEditSeriesCadence}
                  className="form-input border-slate-300 bg-white text-slate-950 disabled:bg-slate-100 disabled:text-slate-500"
                >
                  {SERIES_CADENCE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {!canEditSeriesCadence ? (
                  <p className="mt-1 text-xs text-slate-500">
                    Choose `This and future events` or `Entire series` above to regenerate the recurring cadence.
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="lg:col-span-2">
              <label className="form-label">Location</label>
              <select
                name="locationId"
                value={form.locationId}
                onChange={handleInputChange}
                className="form-input border-slate-300 bg-white text-slate-950"
              >
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {formatLocationPrimary(location)} - {formatLocationSecondary(location)}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-2">
              <label className="form-label">Venue Label</label>
              <input
                type="text"
                name="venueLabel"
                value={form.venueLabel}
                onChange={handleInputChange}
                className="form-input border-slate-300 bg-white text-slate-950"
              />
            </div>

            <div>
              <label className="form-label">Cost</label>
              <input
                type="text"
                name="costText"
                value={form.costText}
                onChange={handleInputChange}
                className="form-input border-slate-300 bg-white text-slate-950"
              />
            </div>

            <div>
              <label className="form-label">Contact Info</label>
              <input
                type="text"
                name="contactInfo"
                value={form.contactInfo}
                onChange={handleInputChange}
                className="form-input border-slate-300 bg-white text-slate-950"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="form-label">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleInputChange}
                rows={5}
                className="form-textarea border-slate-300 bg-white text-slate-950"
              />
            </div>
          </div>
        </div>

        <div className="form-card-actions justify-between">
          <CrudActionButton
            type="button"
            variant="danger"
            icon={Trash2}
            label={isDeleting ? 'Deleting event' : 'Delete event'}
            onClick={handleDelete}
            disabled={isDeleting || isSaving}
          >
            {isDeleting ? 'Deleting...' : 'Delete Event'}
          </CrudActionButton>
          <CrudActionButton
            type="submit"
            variant="primary"
            icon={Save}
            label={isSaving ? 'Saving event' : 'Save event'}
            disabled={isSaving || isDeleting}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </CrudActionButton>
        </div>
      </form>
    </section>
  );
}
