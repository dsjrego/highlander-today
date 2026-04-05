'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { getCategoryHref } from '@/lib/category-config';
import { hasTrustedAccess } from '@/lib/trust-access';

export interface NavSubcategory {
  label: string;
  slug: string;
  href?: string;
}

export interface NavSection {
  label: string;
  href: string;
  slug: string;
  subcategories: NavSubcategory[];
}

type CategoryNavRecord = {
  id: string;
  name: string;
  slug: string;
  minTrustLevel: 'ANONYMOUS' | 'REGISTERED' | 'TRUSTED' | 'SUSPENDED';
  parentCategoryId: string | null;
  sortOrder: number;
};

const TRUST_LEVEL_RANK: Record<CategoryNavRecord['minTrustLevel'], number> = {
  ANONYMOUS: 0,
  REGISTERED: 1,
  TRUSTED: 2,
  SUSPENDED: 3,
};

function getViewerTrustRank(
  trustLevel: CategoryNavRecord['minTrustLevel'] | undefined,
  role: string | undefined
) {
  if (hasTrustedAccess({ trustLevel, role })) {
    return TRUST_LEVEL_RANK.TRUSTED;
  }

  if (!trustLevel) {
    return TRUST_LEVEL_RANK.ANONYMOUS;
  }

  return TRUST_LEVEL_RANK[trustLevel];
}

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
        aria-label={`Toggle ${section.label} submenu`}
        className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:border-cyan-300/25 hover:bg-white/[0.11] hover:text-white"
        onClick={() => setOpen((current) => !current)}
      >
        <span>{section.label}</span>
        <svg
          className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
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

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:border-cyan-300/25 hover:bg-white/[0.11] hover:text-white"
    >
      {label}
    </Link>
  );
}

export default function NavigationBar() {
  const { data: session } = useSession();
  const [categories, setCategories] = useState<CategoryNavRecord[]>([]);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch('/api/categories');
        if (!res.ok) return;

        const data = await res.json();
        setCategories(data.categories || []);
      } catch (err) {
        console.error('Failed to fetch navigation categories:', err);
      }
    }

    fetchCategories();
  }, []);

  const dynamicSections = useMemo(() => {
    const viewerTrustRank = getViewerTrustRank(
      session?.user?.trust_level as CategoryNavRecord['minTrustLevel'] | undefined,
      session?.user?.role
    );
    const topLevelCategories = [...categories]
      .filter(
        (category) =>
          category.parentCategoryId === null &&
          viewerTrustRank >= TRUST_LEVEL_RANK[category.minTrustLevel]
      )
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

    return topLevelCategories.map((topLevelCategory) => {
      const children = categories
        .filter(
          (category) =>
            category.parentCategoryId === topLevelCategory.id &&
            viewerTrustRank >= TRUST_LEVEL_RANK[category.minTrustLevel]
        )
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

      return {
        label: topLevelCategory.name,
        href: getCategoryHref(topLevelCategory.slug),
        slug: topLevelCategory.slug,
        subcategories: children.map((child) => ({
          label: child.name,
          slug: child.slug,
          href: getCategoryHref(child.slug, topLevelCategory.slug),
        })),
      } satisfies NavSection;
    });
  }, [categories, session?.user?.role, session?.user?.trust_level]);

  return (
    <nav className="hidden md:block">
      <div className="overflow-visible">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/"
            className="rounded-full border border-white/25 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-white/[0.12] hover:text-white"
          >
            Home
          </Link>

          {dynamicSections.map((section) =>
            section.subcategories.length > 0 ? (
              <NavDropdown key={section.slug} section={section} />
            ) : (
              <NavLink key={section.slug} href={section.href} label={section.label} />
            )
          )}
        </div>
      </div>
    </nav>
  );
}
