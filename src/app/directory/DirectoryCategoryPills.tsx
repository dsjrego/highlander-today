'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

type TypeOption = {
  value: string;
  label: string;
};

type DirectoryCategoryPillsProps = {
  query: string;
  activeCategorySlug: string | null;
  selectedBusinessType: string;
  selectedOrganizationType: string;
  businessOptions: readonly TypeOption[];
  organizationOptions: readonly TypeOption[];
};

function buildDirectoryHref(category?: string | null, query?: string | null, type?: string | null) {
  const params = new URLSearchParams();

  if (category) {
    params.set('category', category);
  }

  if (query) {
    params.set('q', query);
  }

  if (type) {
    params.set('type', type);
  }

  const search = params.toString();
  return search ? `/directory?${search}` : '/directory';
}

function DropdownPill({
  label,
  isActive,
  open,
  onToggle,
  options,
  allHref,
  selectedType,
  query,
  categorySlug,
}: {
  label: string;
  isActive: boolean;
  open: boolean;
  onToggle: () => void;
  options: readonly TypeOption[];
  allHref: string;
  selectedType: string;
  query: string;
  categorySlug: string;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
          isActive
            ? 'bg-slate-950 text-white'
            : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
        }`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-2">
          <span>{label}</span>
          <svg
            className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            aria-hidden="true"
          >
            <path d="m5 7.5 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-20 mt-2 min-w-[220px] rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
          <Link
            href={allHref}
            className={`block rounded-xl px-3 py-2 text-sm ${
              isActive && !selectedType ? 'bg-slate-950 text-white' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            {`All ${label} Types`}
          </Link>
          {options.map((option) => (
            <Link
              key={option.value}
              href={buildDirectoryHref(categorySlug, query || null, option.value)}
              className={`block rounded-xl px-3 py-2 text-sm ${
                selectedType === option.value ? 'bg-slate-950 text-white' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {option.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function DirectoryCategoryPills({
  query,
  activeCategorySlug,
  selectedBusinessType,
  selectedOrganizationType,
  businessOptions,
  organizationOptions,
}: DirectoryCategoryPillsProps) {
  const [openMenu, setOpenMenu] = useState<'businesses' | 'organizations' | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="flex flex-wrap gap-2">
      <Link
        href={buildDirectoryHref(null, query || null, null)}
        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
          !activeCategorySlug
            ? 'bg-slate-950 text-white'
            : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
        }`}
      >
        All
      </Link>
      <Link
        href={buildDirectoryHref('people', query || null, null)}
        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
          activeCategorySlug === 'people'
            ? 'bg-slate-950 text-white'
            : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
        }`}
      >
        People
      </Link>
      <DropdownPill
        label="Businesses"
        isActive={activeCategorySlug === 'businesses'}
        open={openMenu === 'businesses'}
        onToggle={() => setOpenMenu((current) => (current === 'businesses' ? null : 'businesses'))}
        options={businessOptions}
        allHref={buildDirectoryHref('businesses', query || null, null)}
        selectedType={selectedBusinessType}
        query={query}
        categorySlug="businesses"
      />
      <Link
        href={buildDirectoryHref('government', query || null, null)}
        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
          activeCategorySlug === 'government'
            ? 'bg-slate-950 text-white'
            : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
        }`}
      >
        Government
      </Link>
      <DropdownPill
        label="Organizations"
        isActive={activeCategorySlug === 'organizations'}
        open={openMenu === 'organizations'}
        onToggle={() => setOpenMenu((current) => (current === 'organizations' ? null : 'organizations'))}
        options={organizationOptions}
        allHref={buildDirectoryHref('organizations', query || null, null)}
        selectedType={selectedOrganizationType}
        query={query}
        categorySlug="organizations"
      />
    </div>
  );
}
