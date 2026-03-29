import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { getArticleSocialImageUrl } from '@/lib/article-images';
import ArticleDetailClient from './ArticleDetailClient';

interface PageProps {
  params: {
    id: string;
  };
}

function buildArticleDescription(excerpt: string | null, body: string) {
  if (excerpt?.trim()) {
    return excerpt.trim();
  }

  const textContent = body
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();

  return textContent.slice(0, 197).trimEnd() + (textContent.length > 197 ? '...' : '');
}

async function getPublishedArticleForMetadata(id: string) {
  return db.article.findUnique({
    where: { id, status: 'PUBLISHED' },
    select: {
      id: true,
      title: true,
      excerpt: true,
      body: true,
      featuredImageUrl: true,
      publishedAt: true,
      updatedAt: true,
      slug: true,
      author: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      category: {
        select: {
          name: true,
        },
      },
    },
  });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const article = await getPublishedArticleForMetadata(params.id);

  if (!article) {
    return {
      title: 'Article',
      description: 'Local Life article on Highlander Today.',
    };
  }

  const description = buildArticleDescription(article.excerpt, article.body);
  const url = `/local-life/${article.id}`;
  const authorName = `${article.author.firstName} ${article.author.lastName}`;
  const imageUrl = getArticleSocialImageUrl(article.id, article.featuredImageUrl);

  return {
    title: article.title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: 'article',
      url,
      title: article.title,
      description,
      siteName: 'Highlander Today',
      publishedTime: article.publishedAt?.toISOString(),
      modifiedTime: article.updatedAt.toISOString(),
      authors: [authorName],
      section: article.category?.name ?? 'Local Life',
      images: [
        {
          url: imageUrl,
          alt: article.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description,
      images: [imageUrl],
    },
  };
}

export default function ArticleDetailPage({ params }: PageProps) {
  return <ArticleDetailClient articleId={params.id} />;
}
