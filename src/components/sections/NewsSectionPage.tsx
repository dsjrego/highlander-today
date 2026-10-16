import Image from 'next/image';
import Link from 'next/link';
import InternalPageHeader from '@/components/shared/InternalPageHeader';
import UserAvatar from '@/components/shared/UserAvatar';
import { getArticleUiImageUrl } from '@/lib/article-images';
import type { NewsSectionData } from '@/lib/news-sections';

function publicationDate(date: Date | null) {
  return date?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' });
}

export default function NewsSectionPage({ data }: { data: NewsSectionData }) {
  const { section, categories, activeCategory, articles, pagination } = data;
  const hero = pagination.page === 1 ? articles[0] : null;
  const headlines = hero ? articles.slice(1) : articles;
  const heroImage = getArticleUiImageUrl(hero?.featuredImageUrl);
  function sectionHref(category?: string, page?: number) {
    const query = new URLSearchParams();
    if (category) query.set('category', category);
    if (page && page > 1) query.set('page', String(page));
    return `/${section.slug}${query.size ? `?${query}` : ''}`;
  }

  return (
    <div className="space-y-6">
      <InternalPageHeader title={section.name} />
      {categories.length > 0 ? (
        <nav aria-label={`${section.name} categories`} className="flex flex-wrap gap-2">
          <Link href={sectionHref()} aria-current={!activeCategory ? 'page' : undefined}
            className={`btn ${!activeCategory ? 'btn-primary' : 'btn-secondary'}`}>
            All
          </Link>
          {categories.map((category) => (
            <Link key={category.id} href={sectionHref(category.slug)}
              aria-current={activeCategory?.id === category.id ? 'page' : undefined}
              className={`btn ${activeCategory?.id === category.id ? 'btn-primary' : 'btn-secondary'}`}>
              {category.name}
            </Link>
          ))}
        </nav>
      ) : null}
      {articles.length === 0 ? (
        <div className="homepage-empty p-8 text-center">
          <p className="empty-state-copy mb-0">No published articles in {activeCategory?.name ?? section.name} yet.</p>
        </div>
      ) : (
        <section className="homepage-feature-card" aria-label={`${activeCategory?.name ?? section.name} news`}>
          <div className={`grid min-w-0 grid-cols-1 ${hero && headlines.length ? 'lg:grid-cols-[1.1fr_0.9fr]' : ''}`}>
            {hero ? (
              <article className="min-w-0" data-news-hero>
                <Link href={`/local-life/${hero.id}`} className="group block no-underline hover:no-underline">
                  {heroImage ? (
                    <div className="homepage-feature-media-cover relative h-72 w-full overflow-hidden md:h-96">
                      <Image src={heroImage} alt={hero.title} fill sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover" />
                    </div>
                  ) : null}
                  <div className="p-5 md:p-6">
                    <p className="homepage-feature-meta text-xs font-semibold">
                      {hero.category?.name ?? section.name} · <time dateTime={hero.publishedAt?.toISOString()}>{publicationDate(hero.publishedAt)}</time>
                    </p>
                    <h2 className="homepage-feature-title mt-2 break-words text-3xl font-bold leading-tight">{hero.title}</h2>
                    {hero.excerpt ? <p className="homepage-feature-description mt-3 text-sm leading-7 md:text-base">{hero.excerpt}</p> : null}
                    <div className="mt-4 flex items-center gap-3">
                      <UserAvatar firstName={hero.author.firstName} lastName={hero.author.lastName}
                        profilePhotoUrl={hero.author.profilePhotoUrl ?? undefined} trustLevel={hero.author.trustLevel}
                        className="h-10 w-10" initialsClassName="homepage-feature-avatar text-sm" />
                      <p className="homepage-feature-author text-sm font-semibold">{hero.author.firstName} {hero.author.lastName}</p>
                    </div>
                  </div>
                </Link>
              </article>
            ) : null}
            {headlines.length > 0 ? (
              <div className={`min-w-0 p-5 md:p-6 ${hero ? 'homepage-feature-divider lg:border-l' : ''}`}>
                <h2 className="homepage-latest-label text-xs font-semibold uppercase tracking-widest">
                  {hero ? 'More headlines' : 'Headlines'}
                </h2>
                <ul className="homepage-latest-list mt-4 space-y-3">
                  {headlines.map((article) => {
                    const image = getArticleUiImageUrl(article.featuredImageUrl);
                    return (
                      <li key={article.id} className="homepage-latest-item pb-3 last:pb-0">
                        <Link href={`/local-life/${article.id}`} className="flex items-start gap-3 no-underline hover:no-underline">
                          <div className="homepage-support-thumb relative h-12 w-12 shrink-0 overflow-hidden rounded-xl">
                            {image ? <Image src={image} alt="" fill sizes="48px" className="object-cover" /> : (
                              <div className="homepage-support-thumb-placeholder flex h-full items-center justify-center text-xs"><span className="homepage-feature-author">News</span></div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="homepage-latest-link m-0 break-words text-sm font-semibold leading-6">{article.title}</h3>
                            <time className="homepage-support-meta text-xs" dateTime={article.publishedAt?.toISOString()}>{publicationDate(article.publishedAt)}</time>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </div>
        </section>
      )}
      {pagination.pages > 1 ? (
        <nav aria-label="News pages" className="flex items-center justify-center gap-4">
          {pagination.page > 1 ? <Link className="btn btn-secondary" href={sectionHref(activeCategory?.slug, pagination.page - 1)}>Previous</Link> : null}
          <span className="page-intro-copy text-sm">Page {pagination.page} of {pagination.pages}</span>
          {pagination.page < pagination.pages ? <Link className="btn btn-secondary" href={sectionHref(activeCategory?.slug, pagination.page + 1)}>Next</Link> : null}
        </nav>
      ) : null}
    </div>
  );
}
