import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface EventCardProps {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  cost?: string;
  photo?: string;
  slug: string;
}

export const EventCard: React.FC<EventCardProps> = ({
  title,
  date,
  time,
  location,
  cost,
  photo,
  slug
}) => {
  const eventDate = new Date(date);
  const isFree = !cost || cost.toLowerCase() === 'free';

  return (
    <article className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {/* Photo */}
      {photo && (
        <div className="relative w-full h-40 bg-gray-200">
          <Image
            src={photo}
            alt={title}
            fill
            className="object-cover"
          />
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {/* Date Badge */}
        <div className="flex items-center gap-2 mb-3">
          <div
            className="text-center px-3 py-2 rounded-lg text-white"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            <div className="text-xs font-semibold">
              {eventDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
            </div>
            <div className="text-lg font-bold">
              {eventDate.getDate()}
            </div>
          </div>

          {isFree && (
            <span
              className="text-xs font-bold px-2 py-1 rounded text-white"
              style={{ backgroundColor: 'var(--brand-accent)' }}
            >
              FREE
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="mb-2">
          <Link href={`/events/${slug}`} className="text-lg font-bold text-gray-900 hover:text-blue-600 line-clamp-2">
            {title}
          </Link>
        </h3>

        {/* Time */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {time}
        </div>

        {/* Location */}
        <div className="flex items-start gap-2 text-sm text-gray-600 mb-4">
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="line-clamp-2">{location}</span>
        </div>

        {/* Cost */}
        {cost && !isFree && (
          <div className="text-sm font-semibold mb-4" style={{ color: 'var(--brand-accent)' }}>
            {cost}
          </div>
        )}

        {/* Link */}
        <div className="text-right">
          <Link
            href={`/events/${slug}`}
            className="text-sm font-medium hover:underline"
            style={{ color: 'var(--brand-primary)' }}
          >
            Learn More →
          </Link>
        </div>
      </div>
    </article>
  );
};
