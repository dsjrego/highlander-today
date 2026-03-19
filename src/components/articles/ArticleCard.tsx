import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface ArticleCardProps {
  id: string;
  title: string;
  excerpt: string;
  featuredImage?: string;
  category: string;
  author: string;
  date: string;
  tags?: string[];
  slug: string;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({
  id,
  title,
  excerpt,
  featuredImage,
  category,
  author,
  date,
  tags = []
}) => {
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return (
    <article className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {/* Featured Image */}
      {featuredImage && (
        <div className="relative w-full h-48 bg-gray-200">
          <Image
            src={featuredImage}
            alt={title}
            fill
            className="object-cover"
          />
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {/* Category Badge */}
        <div className="mb-3">
          <span
            className="inline-block px-3 py-1 text-xs font-semibold text-white rounded-full"
            style={{ backgroundColor: '#46A8CC' }}
          >
            {category}
          </span>
        </div>

        {/* Title */}
        <h3 className="mb-2">
          <Link href={`/local-life/${id}`} className="text-lg font-bold text-gray-900 hover:text-blue-600 line-clamp-2">
            {title}
          </Link>
        </h3>

        {/* Excerpt */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {excerpt}
        </p>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Meta Information */}
        <div className="flex items-center justify-between text-xs text-gray-500 border-t pt-3">
          <div className="flex items-center gap-2">
            <span className="font-medium">{author}</span>
            <span>•</span>
            <time dateTime={date}>{formattedDate}</time>
          </div>
          <Link
            href={`/local-life/${id}`}
            className="font-medium hover:underline"
            style={{ color: '#46A8CC' }}
          >
            Read →
          </Link>
        </div>
      </div>
    </article>
  );
};
