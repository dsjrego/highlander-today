import React from 'react';
import Link from 'next/link';

interface FooterProps {
  communityName?: string;
  year?: number;
}

export const Footer: React.FC<FooterProps> = ({
  communityName = 'Highlander Community',
  year = new Date().getFullYear()
}) => {
  return (
    <footer className="mt-16 text-red-100" style={{ backgroundColor: '#7a1222' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* About */}
          <div>
            <h3 className="text-white font-bold mb-4">About</h3>
            <p className="text-sm text-red-200">
              {communityName} - Your local news, events, market, and help wanted platform.
            </p>
          </div>

          {/* Community */}
          <div>
            <h3 className="text-white font-bold mb-4">Community</h3>
            <ul className="text-sm space-y-2">
              <li>
                <Link href="/about" className="text-red-200 hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-red-200 hover:text-white transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/trust-system" className="text-red-200 hover:text-white transition-colors">
                  Trust System
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white font-bold mb-4">Legal</h3>
            <ul className="text-sm space-y-2">
              <li>
                <Link href="/privacy" className="text-red-200 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-red-200 hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/guidelines" className="text-red-200 hover:text-white transition-colors">
                  Community Guidelines
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-red-800 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-red-200">
              &copy; {year} {communityName}. All rights reserved.
            </p>
            <div className="text-sm text-red-200">
              Built with Tailwind CSS & Next.js
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
