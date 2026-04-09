'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { getCategoryHref } from '@/lib/category-config';
import { hasTrustedAccess } from '@/lib/trust-access';

const ADMIN_ROLES = ['STAFF_WRITER', 'EDITOR', 'ADMIN', 'SUPER_ADMIN'];

type CategoryNavRecord = {
  id: string;
  name: string;
  slug: string;
  minTrustLevel: 'ANONYMOUS' | 'REGISTERED' | 'TRUSTED' | 'SUSPENDED';
  parentCategoryId: string | null;
  sortOrder: number;
};

type MobileNavSection = {
  label: string;
  href: string;
  slug: string;
  subcategories: Array<{ label: string; href: string; slug: string }>;
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

function MobileHamburgerIcon() {
  return (
    <span aria-hidden="true" className="flex h-4 w-4 flex-col items-center justify-center gap-[3px] md:hidden">
      <span className="block h-[1.5px] w-4 rounded-full bg-current" />
      <span className="block h-[1.5px] w-4 rounded-full bg-current" />
      <span className="block h-[1.5px] w-4 rounded-full bg-current" />
    </span>
  );
}

export default function BannerActions() {
  const { data: session, status } = useSession();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const userRole = session?.user?.role;
  const showAdmin = userRole ? ADMIN_ROLES.includes(userRole) : false;

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [categories, setCategories] = useState<CategoryNavRecord[]>([]);
  const [openMobileSection, setOpenMobileSection] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch('/api/categories');
        if (!res.ok) return;

        const data = await res.json();
        setCategories(data.categories || []);
      } catch (err) {
        console.error('Failed to fetch mobile navigation categories:', err);
      }
    }

    fetchCategories();
  }, []);

  useEffect(() => {
    if (status !== 'authenticated' || !userId) {
      setUnreadCount(0);
      return;
    }

    let active = true;

    async function loadUnreadCount() {
      try {
        const res = await fetch('/api/messages?limit=100', { cache: 'no-store' });
        const data: { conversations?: Array<{ unreadCount: number }> } = await res.json();

        if (!res.ok || !data.conversations) {
          return;
        }

        const totalUnread = data.conversations.reduce(
          (sum, conversation) => sum + conversation.unreadCount,
          0
        );

        if (active) {
          setUnreadCount(totalUnread);
        }
      } catch {
        if (active) {
          setUnreadCount(0);
        }
      }
    }

    loadUnreadCount();
    const intervalId = window.setInterval(loadUnreadCount, 30000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [status, userId]);

  const mobileSections = useMemo(() => {
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
      } satisfies MobileNavSection;
    });
  }, [categories, session?.user?.role, session?.user?.trust_level]);

  const renderMobileNavigation = () => (
    <div className="border-b border-white/10 py-2 md:hidden">
      <Link
        href="/"
        className="block px-4 py-2 text-right text-sm font-semibold text-cyan-200 hover:bg-white/5 hover:text-white"
        onClick={() => setDropdownOpen(false)}
      >
        Home
      </Link>
      {mobileSections.map((section) =>
        section.subcategories.length > 0 ? (
          <div key={section.slug}>
            <button
              type="button"
              onClick={() =>
                setOpenMobileSection((current) => (current === section.slug ? null : section.slug))
              }
              className="flex w-full items-center justify-end gap-2 px-4 py-2 text-right text-sm font-semibold text-cyan-200 transition hover:bg-white/5 hover:text-white"
            >
              <svg
                className={`h-3.5 w-3.5 transition-transform ${openMobileSection === section.slug ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
              <span>{section.label}</span>
            </button>
            {openMobileSection === section.slug && (
              <div className="pb-1">
                {section.subcategories.map((sub) => (
                  <Link
                    key={sub.slug}
                    href={sub.href}
                    className="block px-4 py-2 text-right text-sm text-white/70 hover:bg-white/5 hover:text-white"
                    onClick={() => setDropdownOpen(false)}
                  >
                    {sub.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : (
          <Link
            key={section.slug}
            href={section.href}
            className="block px-4 py-2 text-right text-sm font-semibold text-cyan-200 hover:bg-white/5 hover:text-white"
            onClick={() => setDropdownOpen(false)}
          >
            {section.label}
          </Link>
        )
      )}
    </div>
  );

  return (
    <div className="flex flex-nowrap items-center justify-end gap-1.5 md:flex-wrap md:gap-2">
      {/* Search link */}
      <Link
        href="/search"
        aria-label="Search"
        className="flex h-[2.125rem] w-[2.125rem] items-center justify-center rounded-full border border-white/18 bg-white/[0.05] text-cyan-300 transition hover:border-white/28 hover:bg-white/[0.1] hover:text-white md:h-auto md:w-auto md:gap-1 md:px-3 md:py-2 md:text-sm md:font-medium"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="sr-only md:not-sr-only">Search</span>
      </Link>

      {/* Messages link */}
      <Link
        href="/messages"
        aria-label="Messages"
        className="relative flex h-[2.125rem] w-[2.125rem] items-center justify-center rounded-full border border-white/18 bg-white/[0.05] text-cyan-300 transition hover:border-white/28 hover:bg-white/[0.1] hover:text-white md:h-auto md:w-auto md:gap-1 md:px-3 md:py-2 md:text-sm md:font-medium"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <span className="sr-only md:not-sr-only">Messages</span>
        {session?.user && unreadCount > 0 && (
          <span
            className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[#A51E30] px-1 text-[11px] font-bold leading-none text-white md:static md:ml-1"
            aria-label={`${unreadCount} unread messages`}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Link>

      {/* Profile dropdown (logged in) or sign-in link (logged out) */}
      {session?.user ? (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-label="Open user menu"
            className="flex h-[2.125rem] w-[2.125rem] items-center justify-center rounded-full border border-white/18 bg-white/[0.05] text-white/88 transition hover:border-white/28 hover:bg-white/[0.1] hover:text-white md:!p-0 md:h-auto md:w-auto md:gap-1 md:px-3 md:py-2 md:text-sm md:font-medium"
          >
            <svg className="hidden w-4 h-4 md:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <MobileHamburgerIcon />
            <span className="hidden md:inline">{session.user.name || 'Profile'}</span>
            <svg className={`hidden w-3 h-3 transition-transform md:block ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-white/10 bg-[#111827]/95 py-1 shadow-2xl backdrop-blur">
              <div className="border-b border-white/10 px-4 py-2 text-right text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100/65 md:hidden">
                Menu
              </div>
              {renderMobileNavigation()}
              <div className="px-4 py-2 text-right text-sm font-medium text-white/88 md:hidden">
                {session.user.name || 'Profile'}
              </div>
              <Link
                href={`/profile/${(session.user as any).id}`}
                className="block px-4 py-2 text-right text-sm text-white/82 hover:bg-white/5"
                onClick={() => setDropdownOpen(false)}
              >
                Profile
              </Link>
              {showAdmin && (
                <Link
                  href="/admin"
                  className="block px-4 py-2 text-right text-sm text-white/82 hover:bg-white/5"
                  onClick={() => setDropdownOpen(false)}
                >
                  Admin
                </Link>
              )}
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  signOut({ callbackUrl: '/' });
                }}
                className="block w-full px-4 py-2 text-right text-sm text-white/82 hover:bg-white/5"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="relative" ref={dropdownRef}>
          <Link
            href="/login"
            className="hidden items-center gap-1 rounded-full border border-white/18 bg-white/[0.05] px-3 py-2 text-sm font-medium text-cyan-300 transition hover:border-white/28 hover:bg-white/[0.1] hover:text-white md:flex"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            Sign In/Up
          </Link>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-label="Open menu"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/18 bg-white/[0.05] text-white/88 transition hover:border-white/28 hover:bg-white/[0.1] hover:text-white md:hidden"
          >
            <MobileHamburgerIcon />
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-white/10 bg-[#111827]/95 py-1 shadow-2xl backdrop-blur md:hidden">
              <div className="border-b border-white/10 px-4 py-2 text-right text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100/65">
                Menu
              </div>
              {renderMobileNavigation()}
              <Link
                href="/login"
                className="block px-4 py-2 text-right text-sm text-white/82 hover:bg-white/5"
                onClick={() => setDropdownOpen(false)}
              >
                Sign In / Sign Up
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
