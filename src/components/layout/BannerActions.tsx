'use client';

import { useState, useRef, useEffect, useMemo, useId } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { getCategoryHref } from '@/lib/category-config';
import ThemeModeToggle from '@/components/theme/ThemeModeToggle';
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
  const userMenuId = useId();
  const guestMenuId = useId();
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
    if (!dropdownOpen) {
      return;
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        setDropdownOpen(false);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [dropdownOpen]);

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

  const articleSubmitHref = session?.user ? '/local-life/submit' : '/login?callbackUrl=/local-life/submit';
  const eventSubmitHref = session?.user ? '/events/submit' : '/login?callbackUrl=/events/submit';

  const renderMobileNavigation = () => (
    <div className="masthead-menu-divider border-b py-2 md:hidden">
      <Link
        href="/"
        className="masthead-menu-item block px-4 py-2 text-right text-sm font-semibold"
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
              aria-expanded={openMobileSection === section.slug}
              aria-controls={`${section.slug}-mobile-submenu`}
              className="masthead-menu-item flex w-full items-center justify-end gap-2 px-4 py-2 text-right text-sm font-semibold transition"
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
              <div id={`${section.slug}-mobile-submenu`} className="pb-1">
                {section.subcategories.map((sub) => (
                  <Link
                    key={sub.slug}
                    href={sub.href}
                    className="masthead-menu-item block px-4 py-2 text-right text-sm"
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
            className="masthead-menu-item block px-4 py-2 text-right text-sm font-semibold"
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
      <Link
        href={articleSubmitHref}
        aria-label="Add article"
        className="masthead-utility-button flex h-[2.125rem] items-center justify-center gap-1.5 px-2.5 text-sm font-medium md:px-3 md:py-2"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 5v14m-7-7h14"
          />
        </svg>
        <span className="hidden md:inline">Article</span>
      </Link>

      <Link
        href={eventSubmitHref}
        aria-label="Add event"
        className="masthead-utility-button flex h-[2.125rem] items-center justify-center gap-1.5 px-2.5 text-sm font-medium md:px-3 md:py-2"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 3v3m8-3v3M4 9h16M6 5h12a2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2Z"
          />
        </svg>
        <span className="hidden md:inline">Event</span>
      </Link>

      {/* Search link */}
      <Link
        href="/search"
        aria-label="Search"
        className="masthead-utility-button flex h-[2.125rem] w-[2.125rem] items-center justify-center md:h-auto md:w-auto md:gap-1 md:px-3 md:py-2 md:text-sm md:font-medium"
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
        className="masthead-utility-button relative flex h-[2.125rem] w-[2.125rem] items-center justify-center md:h-auto md:w-auto md:gap-1 md:px-3 md:py-2 md:text-sm md:font-medium"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <span className="sr-only md:not-sr-only">Messages</span>
        {session?.user && unreadCount > 0 && (
          <span
            className="masthead-unread-badge absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center px-1 text-[11px] font-bold leading-none md:static md:ml-1"
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
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-label="Open user menu"
            aria-haspopup="menu"
            aria-expanded={dropdownOpen}
            aria-controls={userMenuId}
            className="masthead-utility-button flex h-[2.125rem] w-[2.125rem] items-center justify-center md:h-auto md:w-auto md:gap-1 md:px-3 md:py-2 md:text-sm md:font-medium"
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
            <div
              id={userMenuId}
              role="menu"
              aria-label="User menu"
              className="masthead-menu-panel absolute right-0 z-50 mt-2 w-64 rounded-2xl py-1 shadow-2xl backdrop-blur"
            >
              <div className="masthead-menu-label border-b px-4 py-2 text-right text-xs font-semibold uppercase tracking-[0.24em] md:hidden">
                Menu
              </div>
              {renderMobileNavigation()}
              <div className="masthead-menu-item px-4 py-2 text-right text-sm font-medium md:hidden">
                {session.user.name || 'Profile'}
              </div>
              <Link
                href={`/profile/${(session.user as any).id}`}
                className="masthead-menu-item block px-4 py-2 text-right text-sm"
                onClick={() => setDropdownOpen(false)}
                role="menuitem"
              >
                Profile
              </Link>
              {showAdmin && (
                <Link
                  href="/admin"
                  className="masthead-menu-item block px-4 py-2 text-right text-sm"
                  onClick={() => setDropdownOpen(false)}
                  role="menuitem"
                >
                  Admin
                </Link>
              )}
              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  signOut({ callbackUrl: '/' });
                }}
                className="masthead-menu-item block w-full px-4 py-2 text-right text-sm"
                role="menuitem"
              >
                Logout
              </button>
              <div className="border-t px-4 py-2">
                <ThemeModeToggle
                  labelMode="always"
                  className="w-full justify-between gap-2 px-4 py-2 text-sm font-medium"
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="relative" ref={dropdownRef}>
          <Link
            href="/login"
            className="masthead-utility-button hidden items-center gap-1 px-3 py-2 text-sm font-medium md:flex"
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
            aria-haspopup="menu"
            aria-expanded={dropdownOpen}
            aria-controls={guestMenuId}
            className="masthead-utility-button flex h-9 w-9 items-center justify-center md:hidden"
          >
            <MobileHamburgerIcon />
          </button>
          {dropdownOpen && (
            <div
              id={guestMenuId}
              role="menu"
              aria-label="Site menu"
              className="masthead-menu-panel absolute right-0 z-50 mt-2 w-64 rounded-2xl py-1 shadow-2xl backdrop-blur md:hidden"
            >
              <div className="masthead-menu-label border-b px-4 py-2 text-right text-xs font-semibold uppercase tracking-[0.24em]">
                Menu
              </div>
              {renderMobileNavigation()}
              <Link
                href="/login"
                className="masthead-menu-item block px-4 py-2 text-right text-sm"
                onClick={() => setDropdownOpen(false)}
                role="menuitem"
              >
                Sign In / Sign Up
              </Link>
              <div className="border-t px-4 py-2">
                <ThemeModeToggle
                  labelMode="always"
                  className="w-full justify-between gap-2 px-4 py-2 text-sm font-medium"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
