import React, { useState } from 'react';

interface TrustBadgeProps {
  trustLevel: 'trusted' | 'under_review' | 'untrusted' | 'suspended';
  size?: 'sm' | 'md' | 'lg';
}

export const TrustBadge: React.FC<TrustBadgeProps> = ({
  trustLevel,
  size = 'sm'
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const sizeClass = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }[size];

  const tooltipText = {
    trusted: 'Trusted member of the community',
    under_review: 'Account under review',
    untrusted: 'Unverified account - use caution',
    suspended: 'Account suspended'
  }[trustLevel];

  const bgColor = {
    trusted: 'transparent',
    under_review: '#F59E0B', // Orange
    untrusted: '#DC2626', // Red
    suspended: '#6B7280' // Gray
  }[trustLevel];

  if (trustLevel === 'trusted') {
    return (
      <div
        className="relative inline-flex items-center cursor-help"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        title={tooltipText}
      >
        <svg
          className={`${sizeClass} text-green-500`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        {showTooltip && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-50">
            {tooltipText}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="relative inline-flex items-center cursor-help"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      title={tooltipText}
    >
      <div
        className={`${sizeClass} rounded-full`}
        style={{ backgroundColor: bgColor }}
      />
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-50">
          {tooltipText}
        </div>
      )}
    </div>
  );
};
