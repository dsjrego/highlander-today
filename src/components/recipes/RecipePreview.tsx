'use client';

import UserAvatar from '@/components/shared/UserAvatar';
import { getArticleUiImageUrl } from '@/lib/article-images';
import { formatRecipeTimeLabel } from '@/lib/recipes';
import { getRecipeMediaDisplayUrl } from '@/lib/recipe-media';

interface RecipePreviewAuthor {
  firstName: string;
  lastName: string;
  profilePhotoUrl?: string | null;
  trustLevel?: string | null;
}

interface RecipeIngredientItem {
  amount?: string;
  unit?: string;
  ingredientName: string;
  preparationNote?: string;
  isOptional?: boolean;
  substitutionNote?: string;
}

interface RecipeIngredientSection {
  title?: string;
  items: RecipeIngredientItem[];
}

interface RecipeStep {
  title?: string;
  body: string;
  timerMinutes?: number;
  imageUrl?: string;
  videoUrl?: string;
  mediaCaption?: string;
}

interface RecipeNote {
  kind: string;
  title?: string;
  body: string;
}

interface RecipePreviewProps {
  title?: string;
  excerpt?: string;
  introHtml?: string;
  featuredImageUrl?: string;
  featuredImageCaption?: string;
  categoryName?: string | null;
  author?: RecipePreviewAuthor | null;
  publishedLabel?: string | null;
  yieldLabel?: string;
  servings?: number;
  prepMinutes?: number;
  cookMinutes?: number;
  totalMinutes?: number;
  ingredientSections: RecipeIngredientSection[];
  steps: RecipeStep[];
  notes: RecipeNote[];
  media?: Array<{
    type: 'IMAGE' | 'VIDEO_EMBED';
    imageUrl?: string;
    embedUrl?: string;
    caption?: string;
    altText?: string;
  }>;
  sourceName?: string;
  sourceUrl?: string;
}

function formatIngredientLine(item: RecipeIngredientItem) {
  const prefix = [item.amount, item.unit].filter(Boolean).join(' ').trim();
  const base = [prefix, item.ingredientName].filter(Boolean).join(' ').trim();
  const detail = [item.preparationNote, item.isOptional ? 'optional' : undefined]
    .filter(Boolean)
    .join(' • ');

  return detail ? `${base} — ${detail}` : base;
}

function formatMetaValue(value?: string | number | null) {
  if (value === undefined || value === null || value === '') return null;
  return String(value);
}

export default function RecipePreview({
  title,
  excerpt,
  introHtml,
  featuredImageUrl,
  featuredImageCaption,
  categoryName,
  author,
  publishedLabel,
  yieldLabel,
  servings,
  prepMinutes,
  cookMinutes,
  totalMinutes,
  ingredientSections,
  steps,
  notes,
  media = [],
  sourceName,
  sourceUrl,
}: RecipePreviewProps) {
  const imageUrl = getArticleUiImageUrl(featuredImageUrl);
  const metaItems = [
    { label: 'Yield', value: formatMetaValue(yieldLabel) },
    { label: 'Servings', value: formatMetaValue(servings) },
    { label: 'Prep', value: formatMetaValue(formatRecipeTimeLabel(prepMinutes)) },
    { label: 'Cook', value: formatMetaValue(formatRecipeTimeLabel(cookMinutes)) },
    { label: 'Total', value: formatMetaValue(formatRecipeTimeLabel(totalMinutes)) },
  ].filter((item) => item.value);
  const recipeHeaderStyle = {
    background:
      'linear-gradient(135deg, color-mix(in srgb, var(--brand-primary) 12%, white) 0%, rgba(255,255,255,0.98) 58%, color-mix(in srgb, var(--brand-accent) 12%, white) 100%)',
    borderColor: 'color-mix(in srgb, var(--brand-primary) 16%, transparent)',
    boxShadow: '0 30px 65px color-mix(in srgb, var(--brand-primary) 10%, rgba(15, 23, 42, 0.18))',
  } as const;

  return (
    <div className="space-y-6">
      <div className="rounded-[24px] border border-cyan-200/70 bg-cyan-50/80 px-4 py-3 text-sm text-slate-700">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.28em] text-[#0f2941]/68">
          Recipe Preview
        </p>
        <p className="mb-0 leading-6 text-slate-600">
          This preview renders the structured recipe layout rather than generic article HTML.
        </p>
      </div>

      <article
        className="overflow-hidden rounded-[32px] border text-slate-900"
        style={recipeHeaderStyle}
      >
        <div className="px-6 py-8 md:px-10 md:py-10">
          <p
            className="text-xs font-semibold uppercase tracking-[0.32em]"
            style={{ color: 'color-mix(in srgb, var(--brand-primary) 78%, var(--brand-accent) 22%)' }}
          >
            {categoryName || 'Recipes & Food'}
          </p>
          <h1 className="mt-4 text-4xl font-black leading-[0.95] tracking-[-0.05em] text-slate-950 md:text-6xl">
            {title?.trim() || 'Your recipe title will appear here'}
          </h1>
          {excerpt?.trim() ? (
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-700 md:text-lg">{excerpt}</p>
          ) : null}
          {(author || publishedLabel) ? (
            <div className="mt-6 flex flex-wrap items-center gap-4">
              {author ? (
                <div className="flex items-center gap-3">
                  <UserAvatar
                    firstName={author.firstName}
                    lastName={author.lastName}
                    profilePhotoUrl={author.profilePhotoUrl}
                    trustLevel={author.trustLevel}
                    className="h-11 w-11"
                    initialsClassName="bg-white/70 text-sm text-slate-700 ring-1 ring-slate-200/80"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      {author.firstName} {author.lastName}
                    </p>
                    <p className="text-xs text-slate-500">{publishedLabel || 'Draft preview'}</p>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {imageUrl ? (
          <figure className="border-t border-slate-200/80 bg-white/80">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={title?.trim() || 'Recipe preview'}
              className="h-[clamp(240px,38vw,460px)] w-full object-cover"
            />
            {featuredImageCaption?.trim() ? (
              <figcaption className="border-t border-slate-200/80 px-5 py-4 text-sm leading-6 text-slate-600 md:px-6">
                {featuredImageCaption.trim()}
              </figcaption>
            ) : null}
          </figure>
        ) : null}

        <div className="grid gap-6 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] px-6 py-8 text-slate-900 md:px-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
          <div className="space-y-6">
            {metaItems.length > 0 ? (
              <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {metaItems.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.08)]"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                      {item.label}
                    </p>
                    <p className="mt-2 text-lg font-bold text-slate-950">{item.value}</p>
                  </div>
                ))}
              </section>
            ) : null}

            {introHtml?.trim() ? (
              <section className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
                <div
                  className="prose prose-lg max-w-none prose-headings:text-slate-950 prose-p:text-slate-700 prose-li:text-slate-700 prose-a:text-[#8f1d2c]"
                  dangerouslySetInnerHTML={{ __html: introHtml }}
                />
              </section>
            ) : null}

            {media.length > 0 ? (
              <section className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                  Gallery
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {media.map((item, index) => {
                    const displayUrl = getRecipeMediaDisplayUrl({
                      type: item.type,
                      imageUrl: item.imageUrl || null,
                      embedUrl: item.embedUrl || null,
                    });
                    if (!displayUrl) return null;

                    return (
                      <figure key={`${item.type}-${index}`} className="overflow-hidden rounded-[20px] border border-slate-200 bg-slate-50">
                        {item.type === 'IMAGE' ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={displayUrl} alt={item.altText || title || 'Recipe media'} className="h-56 w-full object-cover" />
                        ) : (
                          <div className="aspect-video w-full">
                            <iframe
                              src={displayUrl}
                              title={item.caption || `Recipe video ${index + 1}`}
                              className="h-full w-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                              allowFullScreen
                            />
                          </div>
                        )}
                        {item.caption?.trim() ? (
                          <figcaption className="px-4 py-3 text-sm leading-6 text-slate-600">
                            {item.caption.trim()}
                          </figcaption>
                        ) : null}
                      </figure>
                    );
                  })}
                </div>
              </section>
            ) : null}

            <section className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                Method
              </p>
              <div className="mt-4 space-y-4">
                {steps.length > 0 ? (
                  steps.map((step, index) => (
                    <div
                      key={`${index}-${step.title || 'step'}`}
                      className="rounded-[22px] border border-slate-200/80 bg-slate-50 px-4 py-4"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-bold text-white">
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          {step.title?.trim() ? (
                            <h3 className="text-lg font-bold text-slate-950">{step.title.trim()}</h3>
                          ) : null}
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                            {step.body}
                          </p>
                          {step.timerMinutes ? (
                            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#8f1d2c]">
                              Timer: {formatRecipeTimeLabel(step.timerMinutes)}
                            </p>
                          ) : null}
                          {step.imageUrl ? (
                            <figure className="mt-4 overflow-hidden rounded-[18px] border border-slate-200 bg-white">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={step.imageUrl} alt={step.mediaCaption || step.title || `Step ${index + 1}`} className="h-56 w-full object-cover" />
                              {step.mediaCaption ? (
                                <figcaption className="px-4 py-3 text-sm leading-6 text-slate-600">
                                  {step.mediaCaption}
                                </figcaption>
                              ) : null}
                            </figure>
                          ) : null}
                          {step.videoUrl ? (
                            <div className="mt-4 overflow-hidden rounded-[18px] border border-slate-200 bg-white">
                              <div className="aspect-video w-full">
                                <iframe
                                  src={getRecipeMediaDisplayUrl({
                                    type: 'VIDEO_EMBED',
                                    imageUrl: null,
                                    embedUrl: step.videoUrl,
                                  }) || ''}
                                  title={step.mediaCaption || step.title || `Step ${index + 1} video`}
                                  className="h-full w-full"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                  allowFullScreen
                                />
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm italic text-slate-500">Instruction steps will appear here.</p>
                )}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                Ingredients
              </p>
              <div className="mt-4 space-y-5">
                {ingredientSections.some((section) => section.items.length > 0) ? (
                  ingredientSections.map((section, sectionIndex) => (
                    <div key={`${sectionIndex}-${section.title || 'section'}`} className="space-y-2">
                      {section.title?.trim() ? (
                        <h3 className="text-base font-bold uppercase tracking-[0.18em] text-[#8f1d2c]">
                          {section.title.trim()}
                        </h3>
                      ) : null}
                      <ul className="space-y-2">
                        {section.items.map((item, itemIndex) => (
                          <li
                            key={`${sectionIndex}-${itemIndex}-${item.ingredientName}`}
                            className="rounded-[18px] border border-slate-200/80 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700"
                          >
                            <span className="font-semibold text-slate-950">
                              {formatIngredientLine(item)}
                            </span>
                            {item.substitutionNote?.trim() ? (
                              <span className="block text-xs text-slate-500">
                                Swap: {item.substitutionNote.trim()}
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                ) : (
                  <p className="text-sm italic text-slate-500">Ingredients will appear here.</p>
                )}
              </div>
            </section>

            {notes.length > 0 ? (
              <section className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                  Notes
                </p>
                <div className="mt-4 space-y-3">
                  {notes.map((note, index) => (
                    <div
                      key={`${index}-${note.kind}`}
                      className="rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-4"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-700">
                        {note.title?.trim() || note.kind.replace(/_/g, ' ')}
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                        {note.body}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {(sourceName || sourceUrl) ? (
              <section className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                  Source
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-700">
                  {sourceName || 'External source'}
                  {sourceUrl ? (
                    <>
                      {' '}
                      <a
                        href={sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="font-semibold text-[#8f1d2c] underline"
                      >
                        Visit source
                      </a>
                    </>
                  ) : null}
                </p>
              </section>
            ) : null}
          </div>
        </div>
      </article>
    </div>
  );
}
