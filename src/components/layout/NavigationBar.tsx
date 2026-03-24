'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { ABOUT_NAV_ITEMS } from '@/lib/about';

// -------------------------------------------------------------------
// NAV SECTION DATA
// These labels + slugs mirror the Category table rows seeded in the DB.
// When wiring to real data, replace this with a server-fetched prop or
// a client-side SWR/fetch from /api/categories.
// -------------------------------------------------------------------

export interface NavSubcategory {
  label: string;
  slug: string;         // matches Category.slug in DB
  href?: string;
}

export interface NavSection {
  label: string;
  href: string;          // top-level landing page route
  slug: string;          // matches parent Category.slug in DB
  subcategories: NavSubcategory[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Local Life',
    href: '/local-life',
    slug: 'local-life',
    subcategories: [
      { label: 'Recipes & Food Traditions', slug: 'recipes-food' },
      { label: 'Local Stories',             slug: 'local-stories' },
      { label: 'People of the Community',   slug: 'people' },
      { label: 'Guides & How-Tos',          slug: 'guides' },
      { label: 'Outdoors Tips',             slug: 'outdoors-tips' },
      { label: 'History & Heritage',         slug: 'history-heritage' },
      { label: 'Arts & Creativity',          slug: 'arts-creativity' },
      { label: 'Opinion & Commentary',       slug: 'opinion-commentary' },
    ],
  },
  {
    label: 'Experiences',
    href: '/experiences',
    slug: 'experiences',
    subcategories: [
      { label: 'Events',                  slug: 'events', href: '/events' },
      { label: 'Outdoor Recreation',      slug: 'outdoor-recreation' },
      { label: 'Sports & Activities',     slug: 'sports-activities' },
      { label: 'Classes & Workshops',     slug: 'classes-workshops' },
      { label: 'Tours & Attractions',     slug: 'tours-attractions' },
      { label: 'Rentals & Getaways',      slug: 'rentals-getaways' },
      { label: 'Entertainment & Nightlife', slug: 'entertainment-nightlife' },
      { label: 'Seasonal Activities',     slug: 'seasonal' },
    ],
  },
];

const ABOUT_SECTION: NavSection = {
  label: 'About',
  href: '/about',
  slug: 'about',
  subcategories: ABOUT_NAV_ITEMS.map((item) => ({
    label: item.label,
    slug: item.href.replace('/about/', '') || 'about',
    href: item.href,
  })),
};

// -------------------------------------------------------------------
// DROPDOWN COMPONENT
// -------------------------------------------------------------------

function NavDropdown({ section }: { section: NavSection }) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 200);
  };

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Trigger */}
      <Link
        href={section.href}
        className="text-red-100 hover:text-white flex items-center gap-1 transition-colors"
      >
        {section.label}
        <svg
          className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </Link>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute left-0 top-full mt-1 w-60 bg-white rounded-lg shadow-xl border border-gray-100 py-2 z-50">
          {/* "View all" link */}
          <Link
            href={section.href}
            className="block px-4 py-2 text-sm font-semibold text-[#A51E30] hover:bg-gray-50 border-b border-gray-100 mb-1"
            onClick={() => setOpen(false)}
          >
            View All {section.label}
          </Link>

          {section.subcategories.map((sub) => (
            <Link
              key={sub.slug}
              href={sub.href || `${section.href}?category=${sub.slug}`}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#A51E30] transition-colors"
              onClick={() => setOpen(false)}
            >
              {sub.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------------
// MAIN NAVIGATION BAR
// -------------------------------------------------------------------

export default function NavigationBar() {
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  return (
    <nav style={{ backgroundColor: '#A51E30' }}>
      <div className="container mx-auto px-4 py-5 flex gap-8 text-base font-medium items-center">
        <Link href="/" className="text-red-100 hover:text-white transition-colors">
          Home
        </Link>

        {NAV_SECTIONS.map((section) => (
          <NavDropdown key={section.slug} section={section} />
        ))}

        <Link href="/marketplace" className="text-red-100 hover:text-white transition-colors">
          Market
        </Link>

        <Link href="/help-wanted" className="text-red-100 hover:text-white transition-colors">
          Help Wanted
        </Link>

        <NavDropdown section={ABOUT_SECTION} />

        {isSuperAdmin && (
          <Link href="/arcade" className="text-red-100 hover:text-white transition-colors">
            Arcade
          </Link>
        )}
      </div>
    </nav>
  );
}
