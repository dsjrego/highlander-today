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
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:border-cyan-300/25 hover:bg-white/[0.11] hover:text-white"
        onClick={() => setOpen((current) => !current)}
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
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-2 w-64 rounded-2xl border border-white/10 bg-[#111827]/95 py-2 shadow-2xl backdrop-blur"
          role="menu"
        >
          {/* "View all" link */}
          <Link
            href={section.href}
            className="mb-1 block border-b border-white/10 px-4 py-3 text-sm font-semibold text-cyan-200 hover:bg-white/5"
            onClick={() => setOpen(false)}
          >
            View All {section.label}
          </Link>

          {section.subcategories.map((sub) => (
            <Link
              key={sub.slug}
              href={sub.href || `${section.href}?category=${sub.slug}`}
              className="block px-4 py-2.5 text-sm text-white/78 transition-colors hover:bg-white/5 hover:text-white"
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
    <nav>
      <div className="overflow-visible">
        <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/"
          className="rounded-full border border-white/25 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-white/[0.12] hover:text-white"
        >
          Home
        </Link>

        {NAV_SECTIONS.map((section) => (
          <NavDropdown key={section.slug} section={section} />
        ))}

        <Link
          href="/marketplace"
          className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:border-cyan-300/25 hover:bg-white/[0.11] hover:text-white"
        >
          Market
        </Link>

        <Link
          href="/help-wanted"
          className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:border-cyan-300/25 hover:bg-white/[0.11] hover:text-white"
        >
          Help Wanted
        </Link>

        <NavDropdown section={ABOUT_SECTION} />

        {isSuperAdmin && (
          <Link
            href="/arcade"
            className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:border-cyan-300/25 hover:bg-white/[0.11] hover:text-white"
          >
            Arcade
          </Link>
        )}
        </div>
      </div>
    </nav>
  );
}
