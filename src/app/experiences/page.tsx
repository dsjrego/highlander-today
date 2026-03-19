'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

// Subcategories — mirrors Category rows in DB (parent: experiences)
const SUBCATEGORIES = [
  { label: 'Events',                    slug: 'events' },
  { label: 'Outdoor Recreation',        slug: 'outdoor-recreation' },
  { label: 'Sports & Activities',       slug: 'sports-activities' },
  { label: 'Classes & Workshops',       slug: 'classes-workshops' },
  { label: 'Tours & Attractions',       slug: 'tours-attractions' },
  { label: 'Rentals & Getaways',        slug: 'rentals-getaways' },
  { label: 'Entertainment & Nightlife', slug: 'entertainment-nightlife' },
  { label: 'Seasonal Activities',       slug: 'seasonal' },
];

export default function ExperiencesPage() {
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get('category');

  const activeSub = SUBCATEGORIES.find((s) => s.slug === activeCategory);

  return (
    <div>
      {/* Page heading */}
      <div className="flex justify-between items-center mb-8 pb-3 border-b-2" style={{ borderColor: '#A51E30' }}>
        <h1 className="text-2xl font-bold">
          {activeSub ? activeSub.label : 'Experiences'}
        </h1>
      </div>

      {/* Category pills */}
      <div className="mb-8 flex flex-wrap gap-2">
        <Link
          href="/experiences"
          className={`px-4 py-2 rounded-full text-sm font-medium transition ${
            !activeCategory
              ? 'text-white'
              : 'bg-white text-gray-600 shadow-sm hover:shadow-md'
          }`}
          style={!activeCategory ? { backgroundColor: '#A51E30' } : {}}
        >
          All
        </Link>
        {SUBCATEGORIES.map((sub) => (
          <Link
            key={sub.slug}
            href={`/experiences?category=${sub.slug}`}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              activeCategory === sub.slug
                ? 'text-white'
                : 'bg-white text-gray-600 shadow-sm hover:shadow-md'
            }`}
            style={activeCategory === sub.slug ? { backgroundColor: '#A51E30' } : {}}
          >
            {sub.label}
          </Link>
        ))}
      </div>

      {/* Placeholder content */}
      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <div className="text-6xl mb-4">🎯</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">
          {activeSub ? activeSub.label : 'Experiences'} — Coming Soon
        </h2>
        <p className="text-gray-500 max-w-md mx-auto mb-6">
          Discover events, outdoor adventures, classes, rentals, and more across Cambria Heights.
          Book tickets, reserve cabins, and find your next adventure — all in one place.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
          {SUBCATEGORIES.map((sub) => (
            <Link
              key={sub.slug}
              href={`/experiences?category=${sub.slug}`}
              className="block bg-gray-50 rounded-lg p-3 text-sm text-gray-600 hover:bg-gray-100 hover:text-[#A51E30] transition-colors border border-gray-100"
            >
              {sub.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
