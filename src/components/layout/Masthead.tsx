import React from 'react';
import Link from 'next/link';

interface MastheadProps {
  isLoggedIn?: boolean;
  username?: string;
  isAdmin?: boolean;
  onLogout?: () => void;
}

export const Masthead: React.FC<MastheadProps> = ({
  isLoggedIn = false,
  username = '',
  isAdmin = false,
  onLogout
}) => {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between gap-8">
          {/* Logo & Site Name */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg" style={{ backgroundcolor: 'var(--brand-primary)' }}>
              <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
                HT
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--brand-primary)' }}>
                Highlander Today
              </h1>
              <p className="text-xs text-gray-500">Community News, Market & Services</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-sm">
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Auth Section */}
          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <div className="flex items-center gap-4">
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="text-sm font-medium hover:text-gray-600"
                    style={{ color: 'var(--brand-accent)' }}
                  >
                    Admin
                  </Link>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">{username}</span>
                  <button
                    onClick={onLogout}
                    className="text-sm px-3 py-1 rounded border border-gray-300 hover:bg-gray-50"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Link
                  href="/login"
                  className="text-sm font-medium px-4 py-2 rounded border border-gray-300 hover:bg-gray-50"
                >
                  Login
                </Link>
                <Link
                  href="/login?mode=sign-up"
                  className="text-sm font-medium px-4 py-2 rounded text-white"
                  style={{ backgroundcolor: 'var(--brand-primary)' }}
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
