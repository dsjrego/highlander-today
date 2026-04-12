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

  return (
    <div className={joinClasses('space-y-6', className)}>
      <div className="rounded-[24px] border border-cyan-200/70 bg-cyan-50/80 px-4 py-3 text-sm text-slate-700">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.28em] text-[#0f2941]/68">
          {previewLabel}
        </p>
        <p className="mb-0 leading-6 text-slate-600">{previewDescription}</p>
      </div>

      <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(145deg,rgba(143,29,44,0.96),rgba(10,32,51,0.94))] px-6 py-8 text-white shadow-[0_35px_80px_rgba(7,17,26,0.22)] md:px-10 md:py-10">
        <div className="max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-100/72">
            {categoryName || 'Local Life'}
          </p>
          <h2 className="mt-4 text-4xl font-black leading-[0.95] tracking-[-0.05em] md:text-6xl">
            {title?.trim() || 'Your article title will appear here'}
          </h2>
          {excerpt?.trim() ? (
            <p className="mt-5 max-w-3xl text-base leading-8 text-white/78 md:text-lg">{excerpt}</p>
          ) : (
            <p className="mt-5 max-w-3xl text-base italic leading-8 text-white/52 md:text-lg">
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
                <p className="text-sm font-semibold text-white">
                  {author.firstName} {author.lastName}
                </p>
                <p className="text-xs text-white/60">
                  {publishedLabel || 'Publication date preview'}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </section>

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

      <section className="rounded-[28px] border border-white/10 bg-white/82 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur md:p-8">
        {hasBody ? (
          <div
            className="prose prose-lg max-w-none prose-headings:text-slate-950 prose-p:text-slate-700 prose-li:text-slate-700 prose-a:text-[#8f1d2c]"
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
