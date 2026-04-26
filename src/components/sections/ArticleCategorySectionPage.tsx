/* eslint-disable @next/next/no-img-element */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import ArticleCreateAction from '@/components/articles/ArticleCreateAction';
import InternalPageHeader from '@/components/shared/InternalPageHeader';
import MemoriamCard from '@/components/memoriam/MemoriamCard';
import { getArticleUiImageUrl } from '@/lib/article-images';
import type { SectionCategoryPill } from '@/lib/category-sections';

interface ArticleSectionPageProps {
  sectionSlug: string;
  sectionName: string;
  intro: string;
  categoryPills: SectionCategoryPill[];
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

interface Recipe {
  id: string;
  title: string;
  excerpt: string | null;
  featuredImageUrl: string | null;
  publishedAt: string | null;
  totalMinutes: number | null;
  servings: number | null;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    profilePhotoUrl: string | null;
  };
  category: { id: string; name: string; slug: string } | null;
}

interface MemorialPage {
  id: string;
  title: string;
  slug: string;
  shortSummary: string | null;
  serviceDetails: string | null;
  pageType: 'DEATH_NOTICE' | 'MEMORIAL_PAGE';
  publishedAt: string | null;
  heroImageUrl: string | null;
  memorialPerson: {
    fullName: string;
    preferredName: string | null;
    birthDate: string | null;
    deathDate: string | null;
    townName: string | null;
  };
  category: { id: string; name: string; slug: string } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function ArticleCategorySectionPage({
  sectionSlug,
  sectionName,
  intro,
  categoryPills,
}: ArticleSectionPageProps) {
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get('category');
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const { data: session } = useSession();

  const [articles, setArticles] = useState<Article[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [memorialPages, setMemorialPages] = useState<MemorialPage[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const activePill = categoryPills.find((pill) => pill.slug === activeCategory) ?? null;
  const isRecipeCategory = activePill?.contentModel === 'RECIPE';
  const isMemoriamCategory = activePill?.contentModel === 'MEMORIAM';

  useEffect(() => {
    async function fetchContent() {
      setIsLoading(true);
      try {
        const url = isRecipeCategory
          ? `/api/recipes?page=${pageParam}&limit=12&category=${encodeURIComponent(activeCategory || '')}`
          : isMemoriamCategory
            ? `/api/memoriam/pages?page=${pageParam}&limit=12&category=${encodeURIComponent(activeCategory || '')}`
            : activeCategory
              ? `/api/articles?page=${pageParam}&limit=12&category=${encodeURIComponent(activeCategory)}`
              : `/api/articles?page=${pageParam}&limit=12&parentCategory=${encodeURIComponent(sectionSlug)}`;

        const res = await fetch(url);
        if (!res.ok) {
          return;
        }

        const data = await res.json();
        setArticles(data.articles || []);
        setRecipes(data.recipes || []);
        setMemorialPages(data.memorialPages || []);
        setPagination(data.pagination);
      } catch (error) {
        console.error(`Failed to fetch ${sectionSlug} content:`, error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchContent();
  }, [activeCategory, isMemoriamCategory, isRecipeCategory, pageParam, sectionSlug]);

  const createHref = isRecipeCategory
    ? activeCategory
      ? `/recipes/submit?category=${encodeURIComponent(activeCategory)}`
      : '/recipes/submit'
    : isMemoriamCategory
      ? activeCategory
        ? `/memoriam/submit?category=${encodeURIComponent(activeCategory)}`
        : '/memoriam/submit'
    : activeCategory
      ? `/local-life/submit?parent=${encodeURIComponent(sectionSlug)}&category=${encodeURIComponent(activeCategory)}`
      : `/local-life/submit?parent=${encodeURIComponent(sectionSlug)}`;

  return (
    <div className="space-y-8">
      <InternalPageHeader
        title={sectionName}
        actions={
          <ArticleCreateAction
            href={createHref}
            label={isRecipeCategory ? 'Recipe' : isMemoriamCategory ? 'Memoriam' : 'Article'}
            trustRequiredMessage={
              isRecipeCategory
                ? 'You must be a trusted user to write and submit recipes for Local Life.'
                : isMemoriamCategory
                  ? 'You must be a trusted user to start a Memoriam submission.'
                : undefined
            }
          />
        }
      />

      <p className="page-intro-copy max-w-3xl text-sm leading-7">{intro}</p>

      {categoryPills.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {categoryPills.map((cat) => (
            <Link
              key={cat.id}
              href={cat.href || `/${sectionSlug}?category=${cat.slug}`}
              className={`subnav-pill px-2.5 py-1 text-xs font-medium ${activeCategory === cat.slug ? 'subnav-pill-active' : ''}`}
            >
              {cat.name}
            </Link>
          ))}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-[28px] border border-white/10 bg-white/70 px-6 py-12 text-center text-slate-500 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
          Loading {isRecipeCategory ? 'recipes' : isMemoriamCategory ? 'memoriam records' : 'articles'}...
        </div>
      ) : (isRecipeCategory ? recipes.length === 0 : isMemoriamCategory ? memorialPages.length === 0 : articles.length === 0) ? (
        <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(160deg,rgba(17,34,52,0.97),rgba(8,20,33,0.97))] px-12 pb-8 pt-12 text-center text-white shadow-[0_24px_55px_rgba(7,17,26,0.18)]">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.32em] text-cyan-100/66">
            {sectionName}
          </p>
          <h2 className="empty-state-title mb-2">
            {activePill
              ? `No ${activePill.name} ${isRecipeCategory ? 'recipes' : isMemoriamCategory ? 'records' : 'articles'} yet`
              : `No ${sectionName.toLowerCase()} ${isRecipeCategory ? 'recipes' : isMemoriamCategory ? 'records' : 'articles'} yet`}
          </h2>
          <p className="empty-state-copy mx-auto mb-6 max-w-md">
            {session?.user
              ? `There are no published ${isRecipeCategory ? 'recipes' : isMemoriamCategory ? 'memoriam records' : 'articles'} in ${activePill?.name ?? sectionName} yet.`
              : `Published ${isRecipeCategory ? 'recipes' : isMemoriamCategory ? 'memoriam records' : 'articles'} for ${activePill?.name ?? sectionName} will appear here.`}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {isRecipeCategory
              ? recipes.map((recipe) => (
              <article key={recipe.id} className="article-card">
                <div className="article-card-image h-52">
                  {getArticleUiImageUrl(recipe.featuredImageUrl) ? (
                    <img
                      src={getArticleUiImageUrl(recipe.featuredImageUrl) || ''}
                      alt={recipe.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="article-card-image-placeholder h-full min-h-0 rounded-none border-x-0 border-t-0 px-5 text-center">
                      <div>
                        <p className="article-card-image-placeholder-label text-[11px] font-semibold uppercase tracking-[0.24em]">
                          {recipe.category?.name || sectionName}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4">
                  {recipe.category ? (
                    <div className="mb-2">
                      <span className="article-card-category-badge inline-block rounded-full px-3 py-1 text-xs font-semibold">
                        {recipe.category.name}
                      </span>
                    </div>
                  ) : null}

                  <h3 className="mb-2">
                    <Link
                      href={`/recipes/${recipe.id}`}
                      className="article-card-title line-clamp-2 text-lg transition-colors"
                    >
                      {recipe.title}
                    </Link>
                  </h3>

                  {recipe.excerpt ? (
                    <p className="article-card-excerpt mb-3 text-sm leading-7">{recipe.excerpt}</p>
                  ) : null}

                  <div className="article-card-footer border-t pt-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="article-card-author font-medium">
                        {recipe.author.firstName} {recipe.author.lastName}
                      </span>
                      {recipe.totalMinutes ? (
                        <>
                          <span>&middot;</span>
                          <span className="article-card-date">{recipe.totalMinutes} min</span>
                        </>
                      ) : null}
                      {recipe.servings ? (
                        <>
                          <span>&middot;</span>
                          <span className="article-card-date">{recipe.servings} servings</span>
                        </>
                      ) : null}
                    </div>
                    <Link href={`/recipes/${recipe.id}`} className="article-card-read-link font-semibold">
                      View recipe &rarr;
                    </Link>
                  </div>
                </div>
              </article>
              ))
              : isMemoriamCategory
                ? (
                <div className="memoriam-feed" style={{ gridColumn: '1 / -1' }}>
                  {memorialPages.map((page, i) => (
                    <MemoriamCard
                      key={page.id}
                      page={page}
                      size={i === 0 ? 'xl' : i === 3 || i === 4 ? 'lg' : 'default'}
                    />
                  ))}
                </div>
                )
              : articles.map((article) => (
              <article key={article.id} className="article-card">
                <div className="article-card-image h-52">
                  {getArticleUiImageUrl(article.featuredImageUrl) ? (
                    <img
                      src={getArticleUiImageUrl(article.featuredImageUrl) || ''}
                      alt={article.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="article-card-image-placeholder h-full min-h-0 rounded-none border-x-0 border-t-0 px-5 text-center">
                      <div>
                        <p className="article-card-image-placeholder-label text-[11px] font-semibold uppercase tracking-[0.24em]">
                          {article.category?.name || sectionName}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4">
                  {article.category ? (
                    <div className="mb-2">
                      <span className="article-card-category-badge inline-block rounded-full px-3 py-1 text-xs font-semibold">
                        {article.category.name}
                      </span>
                    </div>
                  ) : null}

                  <h3 className="mb-2">
                    <Link
                      href={`/local-life/${article.id}`}
                      className="article-card-title line-clamp-2 text-lg transition-colors"
                    >
                      {article.title}
                    </Link>
                  </h3>

                  {article.excerpt ? (
                    <p className="article-card-excerpt mb-3 text-sm leading-7">{article.excerpt}</p>
                  ) : null}

                  {article.tags.length > 0 ? (
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {article.tags.slice(0, 3).map((articleTag) => (
                        <span
                          key={articleTag.tag.id}
                          className="article-card-tag rounded-full px-2.5 py-1 text-xs"
                        >
                          #{articleTag.tag.name}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="article-card-footer border-t pt-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="article-card-author font-medium">
                        {article.author.firstName} {article.author.lastName}
                      </span>
                      <span>&middot;</span>
                      <time className="article-card-date" dateTime={article.publishedAt}>
                        {new Date(article.publishedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </time>
                    </div>
                    <Link href={`/local-life/${article.id}`} className="article-card-read-link font-semibold">
                      Read &rarr;
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {pagination && pagination.pages > 1 ? (
            <div className="mt-8 flex justify-center gap-2">
              {Array.from({ length: pagination.pages }, (_, index) => index + 1).map((page) => (
                <Link
                  key={page}
                  href={`/${sectionSlug}?${activeCategory ? `category=${encodeURIComponent(activeCategory)}&` : ''}page=${page}`}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                    page === pagination.page
                      ? 'border border-white/10 bg-slate-950 text-white'
                      : 'border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50'
                  }`}
                >
                  {page}
                </Link>
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
