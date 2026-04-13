'use client';

import UserAvatar from '@/components/shared/UserAvatar';
import { getArticleUiImageUrl } from '@/lib/article-images';

interface ArticlePreviewAuthor {
  firstName: string;
  lastName: string;
  profilePhotoUrl?: string | null;
  trustLevel?: string | null;
}

interface ArticlePreviewProps {
  title?: string;
  excerpt?: string | null;
  body?: string;
  featuredImageUrl?: string | null;
  featuredImageCaption?: string | null;
  categoryName?: string | null;
  tags?: string[];
  author?: ArticlePreviewAuthor | null;
  publishedLabel?: string | null;
  previewLabel?: string;
  previewDescription?: string;
  className?: string;
}

function joinClasses(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(' ');
}

function getPlainText(html?: string) {
  return (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function hasEditorialArticleMarkup(html?: string) {
  return /editorial-(dropcap|pullquote|recipe-card|note-box)/.test(html || '');
}

export default function ArticlePreview({
  title,
  excerpt,
  body,
  featuredImageUrl,
  featuredImageCaption,
  categoryName,
  tags = [],
  author,
  publishedLabel,
  previewLabel = 'Article Preview',
  previewDescription = 'This is an approximate reader-facing preview of the article layout.',
  className,
}: ArticlePreviewProps) {
  const hasBody = getPlainText(body).length > 0;
  const previewImageUrl = getArticleUiImageUrl(featuredImageUrl);
  const isEditorialArticle = hasEditorialArticleMarkup(body);
  const articleHeaderStyle = {
    background:
      'linear-gradient(145deg, color-mix(in srgb, var(--brand-accent) 74%, transparent), color-mix(in srgb, var(--card-bg-accent) 92%, var(--card-bg) 8%))',
    borderColor: 'color-mix(in srgb, var(--page-title) 10%, transparent)',
    boxShadow: '0 35px 80px color-mix(in srgb, var(--brand-primary) 10%, rgba(7, 17, 26, 0.22))',
  } as const;
  const articleKickerStyle = {
    color: 'color-mix(in srgb, var(--brand-primary) 34%, var(--page-title) 66%)',
  } as const;
  const articleExcerptStyle = {
    color: 'color-mix(in srgb, var(--page-title) 78%, transparent)',
  } as const;
  const articleExcerptPlaceholderStyle = {
    color: 'color-mix(in srgb, var(--page-title) 52%, transparent)',
  } as const;
  const articleAuthorSubtleStyle = {
    color: 'color-mix(in srgb, var(--page-title) 60%, transparent)',
  } as const;

  return (
    <div className={joinClasses('space-y-6', className)}>
      <div className="rounded-[24px] border border-cyan-200/70 bg-cyan-50/80 px-4 py-3 text-sm text-slate-700">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.28em] text-[#0f2941]/68">
          {previewLabel}
        </p>
        <p className="mb-0 leading-6 text-slate-600">{previewDescription}</p>
      </div>

      {isEditorialArticle ? (
        <section className="editorial-article-surface px-6 py-8 md:px-10 md:py-10">
          <div className="editorial-article-shell">
            <header className="editorial-article-header">
              <p className="editorial-article-kicker">{categoryName || 'Local Life'}</p>
              <h2 className="editorial-article-title">
                {title?.trim() || 'Your article title will appear here'}
              </h2>
              {excerpt?.trim() ? (
                <p className="editorial-article-dek">{excerpt}</p>
              ) : null}
              {(author || publishedLabel) ? (
                <div className="editorial-article-meta">
                  {author ? (
                    <span>
                      {author.firstName} {author.lastName}
                    </span>
                  ) : null}
                  {publishedLabel ? <span>{publishedLabel}</span> : null}
                </div>
              ) : null}
            </header>
          </div>
        </section>
      ) : (
        <section
          className="overflow-hidden rounded-[32px] border px-6 py-8 shadow-[0_35px_80px_rgba(7,17,26,0.22)] md:px-10 md:py-10"
          style={articleHeaderStyle}
        >
          <div className="max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-[0.32em]" style={articleKickerStyle}>
              {categoryName || 'Local Life'}
            </p>
            <h2 className="mt-4 text-4xl font-black leading-[0.95] tracking-[-0.05em] md:text-6xl" style={{ color: 'var(--page-title)' }}>
              {title?.trim() || 'Your article title will appear here'}
            </h2>
            {excerpt?.trim() ? (
              <p className="mt-5 max-w-3xl text-base leading-8 md:text-lg" style={articleExcerptStyle}>{excerpt}</p>
            ) : (
              <p className="mt-5 max-w-3xl text-base italic leading-8 md:text-lg" style={articleExcerptPlaceholderStyle}>
                Add an excerpt to show a short summary beneath the title.
              </p>
            )}
            {author ? (
              <div className="mt-6 flex items-center gap-3">
                <UserAvatar
                  firstName={author.firstName}
                  lastName={author.lastName}
                  profilePhotoUrl={author.profilePhotoUrl}
                  trustLevel={author.trustLevel}
                  className="h-11 w-11"
                  initialsClassName="bg-white/12 text-sm text-white/78"
                />
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--page-title)' }}>
                    {author.firstName} {author.lastName}
                  </p>
                  <p className="text-xs" style={articleAuthorSubtleStyle}>
                    {publishedLabel || 'Publication date preview'}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      )}

      {previewImageUrl || !isEditorialArticle ? (
      <figure className="overflow-hidden rounded-[28px] border border-white/10 bg-white/82 shadow-[0_24px_55px_rgba(7,17,26,0.14)]">
        {previewImageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewImageUrl} alt={title?.trim() || 'Article preview'} className="h-auto w-full" />
          </>
        ) : (
          <div className="article-card-image-placeholder min-h-[18rem] rounded-none border-x-0 border-t-0 px-6 py-10">
            <div>
              <p className="article-card-image-placeholder-label text-xs font-semibold uppercase tracking-[0.28em]">
                {categoryName || 'Local Life'}
              </p>
            </div>
          </div>
        )}
        {featuredImageCaption?.trim() ? (
          <figcaption className="border-t border-slate-200/80 px-5 py-4 text-sm leading-6 text-slate-600 md:px-6">
            {featuredImageCaption.trim()}
          </figcaption>
        ) : null}
      </figure>
      ) : null}

      <section className={`p-6 md:p-8 ${isEditorialArticle ? 'editorial-article-surface' : 'rounded-[28px] border border-white/10 bg-white/82 shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur'}`}>
        {hasBody ? (
          <div
            className={`article-card-content prose prose-lg max-w-none prose-headings:text-slate-950 prose-p:text-slate-700 prose-li:text-slate-700 prose-a:text-[#8f1d2c] ${isEditorialArticle ? 'editorial-article-body' : ''}`}
            dangerouslySetInnerHTML={{ __html: body || '' }}
          />
        ) : (
          <p className="mb-0 text-base italic leading-8 text-slate-400">
            Your article body will appear here once you start writing.
          </p>
        )}
      </section>

      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-slate-950 px-3 py-1 text-xs font-medium text-white"
            >
              #{tag}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
