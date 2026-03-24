'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface EventDetail {
  id: string;
  title: string;
  description: string | null;
  status: string;
  startDatetime: string;
  endDatetime: string | null;
  locationText: string | null;
  costText: string | null;
  contactInfo: string | null;
  photoUrl: string | null;
  submittedBy: {
    id: string;
    firstName: string;
    lastName: string;
    profilePhotoUrl: string | null;
    bio: string | null;
  };
}

export default function EventDetailPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchEvent() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/events/${eventId}`);
        if (res.ok) {
          const data = await res.json();
          setEvent(data);
        } else if (res.status === 404) {
          setNotFound(true);
        }
      } catch (err) {
        console.error('Failed to fetch event:', err);
      } finally {
        setIsLoading(false);
      }
    }

    if (eventId) fetchEvent();
  }, [eventId]);

  if (isLoading) {
    return <div className="flex justify-center items-center py-20 text-gray-500">Loading event...</div>;
  }

  if (notFound || !event) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">📅</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Event Not Found</h1>
        <p className="text-gray-500 mb-6">This event may have been removed or is not yet published.</p>
        <Link
          href="/events"
          className="inline-block px-6 py-3 text-white font-semibold rounded-full hover:opacity-90 transition"
          style={{ backgroundColor: '#A51E30' }}
        >
          Back to Events
        </Link>
      </div>
    );
  }

  return (
    <div>
      {event.status !== 'PUBLISHED' && (
        <div className={`mb-6 p-3 rounded-lg text-sm font-medium ${
          event.status === 'PENDING_REVIEW'
            ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
            : 'bg-gray-100 text-gray-700'
        }`}>
          {event.status === 'PENDING_REVIEW'
            ? 'This event is pending editor review.'
            : 'This event is unpublished and visible only to you or moderators.'}
        </div>
      )}

      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/events" className="hover:text-[#A51E30] transition-colors">
          Events
        </Link>
        <span>/</span>
        <span>{event.title}</span>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-4 leading-tight">{event.title}</h1>

      <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-200">
        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
          {event.submittedBy.profilePhotoUrl ? (
            <img src={event.submittedBy.profilePhotoUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm font-bold text-gray-500">
              {event.submittedBy.firstName[0]}{event.submittedBy.lastName[0]}
            </span>
          )}
        </div>
        <div>
          <Link
            href={`/profile/${event.submittedBy.id}`}
            className="font-semibold text-gray-800 hover:text-[#A51E30] transition-colors text-sm"
          >
            {event.submittedBy.firstName} {event.submittedBy.lastName}
          </Link>
          <p className="text-xs text-gray-400">
            {new Date(event.startDatetime).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>

      {event.photoUrl && (
        <div className="mb-8 rounded-xl overflow-hidden">
          <img src={event.photoUrl} alt={event.title} className="w-full h-auto" />
        </div>
      )}

      <div className="grid gap-4 bg-white rounded-xl shadow-sm p-6 mb-8">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-1">When</h2>
          <p className="text-gray-800">
            {new Date(event.startDatetime).toLocaleString()}
            {event.endDatetime && ` to ${new Date(event.endDatetime).toLocaleString()}`}
          </p>
        </div>
        {event.locationText && (
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-1">Where</h2>
            <p className="text-gray-800">{event.locationText}</p>
          </div>
        )}
        {event.costText && (
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-1">Cost</h2>
            <p className="text-gray-800">{event.costText}</p>
          </div>
        )}
        {event.contactInfo && (
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-1">Contact</h2>
            <p className="text-gray-800">{event.contactInfo}</p>
          </div>
        )}
      </div>

      {event.description && (
        <div className="prose prose-lg max-w-none mb-8">
          <p>{event.description}</p>
        </div>
      )}

      {event.submittedBy.bio && (
        <div className="bg-gray-50 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">About the Organizer</h3>
          <p className="text-sm text-gray-500">{event.submittedBy.bio}</p>
        </div>
      )}
    </div>
  );
}
