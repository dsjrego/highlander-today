'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import InternalPageHeader from '@/components/shared/InternalPageHeader';
import ArticleCreateAction from '@/components/articles/ArticleCreateAction';
import { LOCAL_LIFE_CATEGORY_HREF_OVERRIDES } from '@/lib/category-config';
import { getArticleUiImageUrl } from '@/lib/article-images';

interface CategoryPill {
  id: string;
  name: string;
  slug: string;
  href?: string;
}

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  featuredImageUrl: string | null;
  status: string;
  publishedAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    profilePhotoUrl: string | null;
  };
  category: { id: string; name: string; slug: string } | null;
  tags: { tag: { id: string; name: string; slug: string } }[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

function LocalLifePageContent() {
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get('category');
  const pageParam = parseInt(searchParams.get('page') || '1');
  const { data: session } = useSession();

  const [categoryPills, setCategoryPills] = useState<CategoryPill[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const activePill = categoryPills.find((c) => c.slug === activeCategory);

  // Fetch published articles, filtered by category if selected
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch('/api/categories?parent=local-life');
        if (!res.ok) return;

        const data = await res.json();
        setCategoryPills(
          (data.categories || []).map((category: { id: string; name: string; slug: string }) => ({
            id: category.id,
            name: category.name,
            slug: category.slug,
            href: LOCAL_LIFE_CATEGORY_HREF_OVERRIDES[category.slug],
          }))
        );
      } catch (err) {
        console.error('Failed to fetch Local Life categories:', err);
      }
    }

    fetchCategories();
  }, []);

  useEffect(() => {
    async function fetchArticles() {
      setIsLoading(true);
      try {
        let url = `/api/articles?page=${pageParam}&limit=12`;

        if (activeCategory) {
          url += `&category=${activeCategory}`;
        }

        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setArticles(data.articles || []);
          setPagination(data.pagination);
        }
      } catch (err) {
        console.error('Failed to fetch articles:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchArticles();
  }, [activeCategory, pageParam]);

  return (
    <div className="space-y-8">
      <InternalPageHeader
        title="Local Life"
        titleClassName="text-white"
        actions={<ArticleCreateAction />}
      />

      {/* Category pills */}
      {categoryPills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {categoryPills.map((cat) => (
            <Link
              key={cat.id}
              href={cat.href || `/local-life?category=${cat.slug}`}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                activeCategory === cat.slug
                  ? 'border border-cyan-300/60 bg-slate-950/90 text-cyan-200 shadow-[0_10px_25px_rgba(15,23,42,0.22)]'
                  : 'border border-cyan-200/25 bg-white/[0.04] text-cyan-300 hover:border-cyan-300/70 hover:bg-cyan-300/12 hover:text-cyan-100 hover:shadow-[0_12px_26px_rgba(34,211,238,0.12)]'
              }`}
            >
              {cat.name}
            </Link>
          ))}
        </div>
      )}

      {/* Articles grid */}
      {isLoading ? (
        <div className="rounded-[28px] border border-white/10 bg-white/70 px-6 py-12 text-center text-slate-500 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
          Loading articles...
        </div>
      ) : articles.length === 0 ? (
        <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(160deg,rgba(17,34,52,0.97),rgba(8,20,33,0.97))] px-12 pt-12 pb-8 text-center text-white shadow-[0_24px_55px_rgba(7,17,26,0.18)]">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.32em] text-cyan-100/66">
            Local Life
          </p>
          <h2 className="empty-state-title mb-2">
            {activePill ? `No ${activePill.name} articles yet` : 'No articles yet'}
          </h2>
          <p className="empty-state-copy mx-auto mb-6 max-w-md">
            Stories, news, and perspectives from the heart of the community.
            {session?.user
              ? ' Be the first to contribute!'
              : ' Check back soon for community-contributed content.'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <article
                key={article.id}
                className="overflow-hidden rounded-[26px] border border-white/10 bg-white/82 shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_24px_55px_rgba(15,23,42,0.12)]"
              >
                <div className="h-52 bg-slate-200">
                  <img
                    src={getArticleUiImageUrl(article.featuredImageUrl)}
                    alt={article.title}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="p-4">
                  {article.category && (
                    <div className="mb-2">
                      <span
                        className="inline-block rounded-full bg-[#eef6fb] px-3 py-1 text-xs font-semibold text-[#0f5771]"
                      >
                        {article.category.name}
                      </span>
                    </div>
                  )}

                  <h3 className="mb-2">
                    <Link
                      href={`/local-life/${article.id}`}
                      className="line-clamp-2 text-lg font-bold text-slate-950 transition-colors hover:text-[#8f1d2c]"
                    >
                      {article.title}
                    </Link>
                  </h3>

                  {article.excerpt && (
                    <p className="mb-3 line-clamp-2 text-sm leading-7 text-slate-600">
                      {article.excerpt}
                    </p>
                  )}

                  {article.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {article.tags.slice(0, 3).map((at) => (
                        <span
                          key={at.tag.id}
                          className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600"
                        >
                          #{at.tag.name}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-600">
                        {article.author.firstName} {article.author.lastName}
                      </span>
                      <span>&middot;</span>
                      <time dateTime={article.publishedAt}>
                        {new Date(article.publishedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </time>
                    </div>
                    <Link
                      href={`/local-life/${article.id}`}
                      className="font-semibold text-[#8f1d2c] hover:underline"
                    >
                      Read &rarr;
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {pagination && pagination.pages > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={`/local-life?${activeCategory ? `category=${activeCategory}&` : ''}page=${p}`}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                    p === pagination.page
                      ? 'border border-white/10 bg-slate-950 text-white'
                      : 'border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50'
                  }`}
                >
                  {p}
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function LocalLifePage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-gray-500">Loading Local Life...</div>}>
      <LocalLifePageContent />
    </Suspense>
  );
}
