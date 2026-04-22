'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface NavigationProps {
  isAdmin?: boolean;
  activePath?: string;
}

export const Navigation: React.FC<NavigationProps> = ({
  isAdmin = false,
  activePath = ''
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/news', label: 'News' },
    { href: '/events', label: 'Events' },
    { href: '/marketplace', label: 'Market' },
    { href: '/help-wanted', label: 'Help Wanted' },
  ];

  const isActive = (href: string) => activePath === href;

  return (
    <nav style={{ backgroundColor: 'var(--brand-accent)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-12">
          {/* Desktop Navigation */}
          <div className="hidden md:flex gap-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? 'text-white border-b-2 border-white'
                    : 'text-red-100 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                href="/admin"
                className={`text-sm font-medium transition-colors ${
                  isActive('/admin')
                    ? 'text-white border-b-2 border-white'
                    : 'text-red-100 hover:text-white'
                }`}
              >
                Admin
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-red-100 hover:text-white hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
            >
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={isMobileMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  isActive(item.href)
                    ? 'text-white bg-red-800'
                    : 'text-red-100 hover:text-white hover:bg-red-800'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                href="/admin"
                className="block px-3 py-2 rounded-md text-base font-medium text-red-100 hover:text-white hover:bg-red-800"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Admin
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};
