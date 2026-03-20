'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface CategoryPill {
  name: string;
  slug: string;
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

  const [articles, setArticles] = useState<Article[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [parentCategories, setParentCategories] = useState<CategoryPill[]>([]);

  const activePill = parentCategories.find((c) => c.slug === activeCategory);

  // Fetch top-level categories for the filter pills
  useEffect(() => {
    async function fetchParentCategories() {
      try {
        const res = await fetch('/api/categories?top=true');
        if (res.ok) {
          const data = await res.json();
          setParentCategories(
            (data.categories || []).map((c: any) => ({ name: c.name, slug: c.slug }))
          );
        }
      } catch (err) {
        console.error('Failed to fetch parent categories:', err);
      }
    }
    fetchParentCategories();
  }, []);

  // Fetch published articles, filtered by parent category if selected
  useEffect(() => {
    async function fetchArticles() {
      setIsLoading(true);
      try {
        let url = `/api/articles?page=${pageParam}&limit=12`;

        if (activeCategory) {
          // Filter by parent category — gets all articles whose category's parent matches
          url += `&parentCategory=${activeCategory}`;
        }
        // No filter = all published articles

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
    <div>
      {/* Page heading */}
      <div className="flex justify-between items-center mb-8 pb-3 border-b-2" style={{ borderColor: '#A51E30' }}>
        <h1 className="text-2xl font-bold">
          {activePill ? activePill.name : 'Local Life'}
        </h1>
        {session?.user && (
          <Link
            href="/local-life/submit"
            className="px-4 py-2 text-white text-sm font-semibold rounded-full hover:opacity-90 transition"
            style={{ backgroundColor: '#A51E30' }}
          >
            + Write Article
          </Link>
        )}
      </div>

      {/* Category pills — loaded from DB */}
      {parentCategories.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          <Link
            href="/local-life"
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              !activeCategory
                ? 'text-white'
                : 'bg-white text-gray-600 shadow-sm hover:shadow-md'
            }`}
            style={!activeCategory ? { backgroundColor: '#A51E30' } : {}}
          >
            All
          </Link>
          {parentCategories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/local-life?category=${cat.slug}`}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                activeCategory === cat.slug
                  ? 'text-white'
                  : 'bg-white text-gray-600 shadow-sm hover:shadow-md'
              }`}
              style={activeCategory === cat.slug ? { backgroundColor: '#A51E30' } : {}}
            >
              {cat.name}
            </Link>
          ))}
        </div>
      )}

      {/* Articles grid */}
      {isLoading ? (
        <div className="text-center text-gray-500 py-12">Loading articles...</div>
      ) : articles.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <div className="text-6xl mb-4">
            {activePill ? '📝' : '🏘️'}
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            {activePill ? `No ${activePill.name} articles yet` : 'No articles yet'}
          </h2>
          <p className="text-gray-500 max-w-md mx-auto mb-6">
            Stories, news, and perspectives from the heart of the community.
            {session?.user
              ? ' Be the first to contribute!'
              : ' Check back soon for community-contributed content.'}
          </p>
          {session?.user && (
            <Link
              href="/local-life/submit"
              className="inline-block px-6 py-3 text-white font-semibold rounded-full hover:opacity-90 transition"
              style={{ backgroundColor: '#A51E30' }}
            >
              Write an Article
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <article
                key={article.id}
                className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition"
              >
                {article.featuredImageUrl && (
                  <div className="h-48 bg-gray-200">
                    <img
                      src={article.featuredImageUrl}
                      alt={article.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="p-4">
                  {article.category && (
                    <div className="mb-2">
                      <span
                        className="inline-block px-2.5 py-0.5 text-xs font-semibold text-white rounded-full"
                        style={{ backgroundColor: '#46A8CC' }}
                      >
                        {article.category.name}
                      </span>
                    </div>
                  )}

                  <h3 className="mb-2">
                    <Link
                      href={`/local-life/${article.id}`}
                      className="text-lg font-bold text-gray-900 hover:text-[#A51E30] line-clamp-2 transition-colors"
                    >
                      {article.title}
                    </Link>
                  </h3>

                  {article.excerpt && (
                    <p className="text-gray-500 text-sm mb-3 line-clamp-2">
                      {article.excerpt}
                    </p>
                  )}

                  {article.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {article.tags.slice(0, 3).map((at) => (
                        <span
                          key={at.tag.id}
                          className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
                        >
                          #{at.tag.name}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-400 border-t pt-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-600">
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
                      className="font-medium hover:underline"
                      style={{ color: '#A51E30' }}
                    >
                      Read &rarr;
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {pagination && pagination.pages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={`/local-life?${activeCategory ? `category=${activeCategory}&` : ''}page=${p}`}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    p === pagination.page
                      ? 'text-white'
                      : 'bg-white text-gray-600 shadow-sm hover:shadow-md'
                  }`}
                  style={p === pagination.page ? { backgroundColor: '#A51E30' } : {}}
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
