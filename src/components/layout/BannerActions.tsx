'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';

const ADMIN_ROLES = ['STAFF_WRITER', 'EDITOR', 'ADMIN', 'SUPER_ADMIN'];

export default function BannerActions() {
  const { data: session, status } = useSession();
  const userRole = session?.user?.role;
  const showAdmin = userRole ? ADMIN_ROLES.includes(userRole) : false;

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
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
    if (status !== 'authenticated') {
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
  }, [status]);

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {/* Search link */}
      <Link
        href="/search"
        className="flex items-center gap-1 rounded-full border border-white/18 bg-white/[0.05] px-3 py-2 text-sm font-medium text-cyan-300 transition hover:border-white/28 hover:bg-white/[0.1] hover:text-white"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        Search
      </Link>

      {/* Messages link */}
      <Link
        href="/messages"
        className="relative flex items-center gap-1 rounded-full border border-white/18 bg-white/[0.05] px-3 py-2 text-sm font-medium text-cyan-300 transition hover:border-white/28 hover:bg-white/[0.1] hover:text-white"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        Messages
        {session?.user && unreadCount > 0 && (
          <span
            className="ml-1 min-w-[1.25rem] h-5 px-1 rounded-full bg-[#A51E30] text-white text-[11px] font-bold flex items-center justify-center leading-none"
            aria-label={`${unreadCount} unread messages`}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Link>

      {/* Profile dropdown (logged in) or Login link (logged out) */}
      {session?.user ? (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="!p-0 flex items-center gap-1 rounded-full border border-white/18 bg-white/[0.05] px-3 py-2 text-sm font-medium text-white/88 transition hover:border-white/28 hover:bg-white/[0.1] hover:text-white"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {session.user.name || 'Profile'}
            <svg className={`w-3 h-3 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 z-50 mt-2 w-44 rounded-2xl border border-white/10 bg-[#111827]/95 py-1 shadow-2xl backdrop-blur">
              <Link
                href={`/profile/${(session.user as any).id}`}
                className="block px-4 py-2 text-sm text-white/82 hover:bg-white/5"
                onClick={() => setDropdownOpen(false)}
              >
                Profile
              </Link>
              {showAdmin && (
                <Link
                  href="/admin"
                  className="block px-4 py-2 text-sm text-white/82 hover:bg-white/5"
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
                className="block w-full px-4 py-2 text-left text-sm text-white/82 hover:bg-white/5"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      ) : (
        <Link
          href="/login"
          className="flex items-center gap-1 rounded-full border border-white/18 bg-white/[0.05] px-3 py-2 text-sm font-medium text-cyan-300 transition hover:border-white/28 hover:bg-white/[0.1] hover:text-white"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
          Login
        </Link>
      )}
    </div>
  );
}
