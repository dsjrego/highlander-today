import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface ListingCardProps {
  id: string;
  title: string;
  price: number;
  category: string;
  photo?: string;
  slug: string;
  seller?: string;
  date?: string;
  condition?: string;
}

export const ListingCard: React.FC<ListingCardProps> = ({
  title,
  price,
  category,
  photo,
  slug,
  seller,
  date,
  condition
}) => {
  const formattedDate = date
    ? new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : null;

  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(price);

  return (
    <article className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
      {/* Photo */}
      {photo && (
        <div className="relative w-full h-48 bg-gray-200">
          <Image
            src={photo}
            alt={title}
            fill
            className="object-cover"
          />
        </div>
      )}

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        {/* Category Badge */}
        <div className="mb-2">
          <span
            className="inline-block px-2 py-1 text-xs font-semibold text-white rounded"
            style={{ backgroundcolor: 'var(--brand-primary)' }}
          >
            {category}
          </span>
        </div>

        {/* Condition */}
        {condition && (
          <div className="mb-2">
            <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">
              {condition}
            </span>
          </div>
        )}

        {/* Title */}
        <h3 className="mb-2">
          <Link href={`/marketplace/${slug}`} className="text-lg font-bold text-gray-900 hover:text-blue-600 line-clamp-2">
            {title}
          </Link>
        </h3>

        {/* Price */}
        <div className="text-2xl font-bold mb-4" style={{ color: 'var(--brand-accent)' }}>
          {formattedPrice}
        </div>

        {/* Seller & Date */}
        <div className="text-xs text-gray-500 space-y-1 mt-auto pt-3 border-t border-gray-200">
          {seller && <div>Seller: {seller}</div>}
          {formattedDate && <div>{formattedDate}</div>}
        </div>

        {/* View Link */}
        <Link
          href={`/marketplace/${slug}`}
          className="mt-3 w-full py-2 rounded text-center font-medium text-white transition-colors"
          style={{ backgroundcolor: 'var(--brand-primary)' }}
        >
          View Listing
        </Link>
      </div>
    </article>
  );
};
