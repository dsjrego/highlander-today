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
    <article className="article-card">
      {featuredImage && (
        <div className="relative h-48 w-full overflow-hidden">
          <Image
            src={featuredImage}
            alt={title}
            fill
            className="object-cover"
          />
        </div>
      )}

      <div className="article-card-content">
        <div className="mb-3">
          <span className="article-card-category-badge inline-block rounded-full px-3 py-1 text-xs font-semibold">
            {category}
          </span>
        </div>

        <h3 className="article-card-title">
          <Link href={`/local-life/${id}`} className="transition-colors hover:text-[var(--card-title)]">
            {title}
          </Link>
        </h3>

        <p className="article-card-excerpt">{excerpt}</p>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {tags.slice(0, 3).map((tag) => (
              <span key={tag} className="article-card-tag rounded px-2 py-1 text-xs">
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="article-card-footer">
          <div className="flex items-center gap-2">
            <span className="font-medium">{author}</span>
            <span>•</span>
            <time dateTime={date}>{formattedDate}</time>
          </div>
          <Link
            href={`/local-life/${id}`}
            className="article-card-read-link font-medium hover:underline"
          >
            Read →
          </Link>
        </div>
      </div>
    </article>
  );
};
