'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import UserAvatar from '@/components/shared/UserAvatar';
import { getArticleUiImageUrl } from '@/lib/article-images';
import { formatRecipeTimeLabel } from '@/lib/recipes';
import { getRecipeMediaDisplayUrl } from '@/lib/recipe-media';

interface RecipeAuthor {
  id: string;
  firstName: string;
  lastName: string;
  profilePhotoUrl: string | null;
  bio: string | null;
  trustLevel: string;
}

interface RecipeIngredient {
  id: string;
  amount: string | null;
  unit: string | null;
  ingredientName: string;
  preparationNote: string | null;
  isOptional: boolean;
  substitutionNote: string | null;
}

interface Recipe {
  id: string;
  title: string;
  excerpt: string | null;
  introHtml: string | null;
  featuredImageUrl: string | null;
  featuredImageCaption: string | null;
  status: string;
  publishedAt: string | null;
  yieldLabel: string | null;
  servings: number | null;
  prepMinutes: number | null;
  cookMinutes: number | null;
  totalMinutes: number | null;
  sourceName: string | null;
  sourceUrl: string | null;
  author: RecipeAuthor;
  category: { id: string; name: string; slug: string; parentCategoryId: string | null } | null;
  ingredientSections: Array<{
    id: string;
    title: string | null;
    ingredients: RecipeIngredient[];
  }>;
  instructionSteps: Array<{
    id: string;
    title: string | null;
    body: string;
    timerMinutes: number | null;
    media?: Array<{
      id: string;
      type: 'IMAGE' | 'VIDEO_EMBED';
      imageUrl: string | null;
      embedUrl: string | null;
      caption: string | null;
      altText: string | null;
    }>;
  }>;
  notes: Array<{
    id: string;
    kind: string;
    title: string | null;
    body: string;
  }>;
  media: Array<{
    id: string;
    stepId: string | null;
    type: 'IMAGE' | 'VIDEO_EMBED';
    imageUrl: string | null;
    embedUrl: string | null;
    caption: string | null;
    altText: string | null;
  }>;
}

interface RecipeDetailClientProps {
  recipeId: string;
}

function renderIngredientLine(item: RecipeIngredient) {
  const prefix = [item.amount, item.unit].filter(Boolean).join(' ').trim();
  const main = [prefix, item.ingredientName].filter(Boolean).join(' ').trim();
  const notes = [item.preparationNote, item.isOptional ? 'optional' : undefined].filter(Boolean).join(' • ');
  return notes ? `${main} — ${notes}` : main;
}

export default function RecipeDetailClient({ recipeId }: RecipeDetailClientProps) {
  const { data: session } = useSession();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchRecipe() {
      setIsLoading(true);
      setNotFound(false);

      try {
        const res = await fetch(`/api/recipes/${recipeId}`);
        if (res.ok) {
          const data = await res.json();
          setRecipe(data);
        } else if (res.status === 404) {
          setRecipe(null);
          setNotFound(true);
        }
      } catch (error) {
        console.error('Failed to fetch recipe:', error);
      } finally {
        setIsLoading(false);
      }
    }

    if (recipeId) {
      fetchRecipe();
    }
  }, [recipeId]);

  if (isLoading) {
    return (
      <div className="rounded-[28px] border border-white/10 bg-white/70 px-6 py-20 text-center text-slate-500 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
        Loading recipe...
      </div>
    );
  }

  if (notFound || !recipe) {
    return (
      <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(160deg,rgba(17,34,52,0.97),rgba(8,20,33,0.97))] py-20 text-center text-white shadow-[0_24px_55px_rgba(7,17,26,0.18)]">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.32em] text-cyan-100/66">Recipes</p>
        <h1 className="mb-2 text-2xl font-bold text-white">Recipe Not Found</h1>
        <p className="mb-6 text-white/70">This recipe may have been removed or is not yet published.</p>
        <Link
          href="/recipes"
          className="inline-block rounded-full bg-white px-6 py-3 font-semibold text-slate-950 transition hover:opacity-90"
        >
          Back to Recipes
        </Link>
      </div>
    );
  }

  const publishedDate = recipe.publishedAt
    ? new Date(recipe.publishedAt).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;
  const imageUrl = getArticleUiImageUrl(recipe.featuredImageUrl);
  const showStatusBanner = recipe.status !== 'PUBLISHED';
  const viewerIsAuthor = (session?.user as { id?: string } | undefined)?.id === recipe.author.id;

  const metaItems = [
    { label: 'Yield', value: recipe.yieldLabel },
    { label: 'Servings', value: recipe.servings ? String(recipe.servings) : null },
    { label: 'Prep', value: formatRecipeTimeLabel(recipe.prepMinutes) },
    { label: 'Cook', value: formatRecipeTimeLabel(recipe.cookMinutes) },
    { label: 'Total', value: formatRecipeTimeLabel(recipe.totalMinutes) },
  ].filter((item) => item.value);
  const recipeHeaderStyle = {
    background:
      'linear-gradient(135deg, color-mix(in srgb, var(--brand-primary) 12%, white) 0%, rgba(255,255,255,0.98) 58%, color-mix(in srgb, var(--brand-accent) 12%, white) 100%)',
    borderColor: 'color-mix(in srgb, var(--brand-primary) 16%, transparent)',
    boxShadow: '0 30px 65px color-mix(in srgb, var(--brand-primary) 10%, rgba(15, 23, 42, 0.18))',
  } as const;

  return (
    <div className="space-y-4">
      {showStatusBanner ? (
        <div
          className={`rounded-2xl p-3 text-sm font-medium ${
            recipe.status === 'DRAFT'
              ? 'bg-gray-100 text-gray-700'
              : recipe.status === 'PENDING_REVIEW'
                ? 'border border-yellow-200 bg-yellow-50 text-yellow-700'
                : 'bg-red-50 text-red-700'
          }`}
        >
          {recipe.status === 'DRAFT' && (viewerIsAuthor ? 'This recipe is a draft and is only visible to you.' : 'This recipe is a draft.')}
          {recipe.status === 'PENDING_REVIEW' && 'This recipe is pending editor review.'}
          {recipe.status === 'UNPUBLISHED' && 'This recipe has been unpublished.'}
        </div>
      ) : null}

      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/recipes" className="transition-colors hover:text-[var(--brand-accent)]">
          Recipes
        </Link>
        {recipe.category ? (
          <>
            <span>/</span>
            <span>{recipe.category.name}</span>
          </>
        ) : null}
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
            {recipe.category?.name || 'Recipes & Food'}
          </p>
          <h1 className="mt-4 text-4xl font-black leading-[0.95] tracking-[-0.05em] text-slate-950 md:text-6xl">
            {recipe.title}
          </h1>
          {recipe.excerpt?.trim() ? (
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-700 md:text-lg">{recipe.excerpt}</p>
          ) : null}
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <UserAvatar
                firstName={recipe.author.firstName}
                lastName={recipe.author.lastName}
                profilePhotoUrl={recipe.author.profilePhotoUrl}
                trustLevel={recipe.author.trustLevel}
                className="h-11 w-11"
                initialsClassName="bg-white/70 text-sm text-slate-700 ring-1 ring-slate-200/80"
              />
              <div>
                <p className="text-sm font-semibold text-slate-950">
                  {recipe.author.firstName} {recipe.author.lastName}
                </p>
                <p className="text-xs text-slate-500">{publishedDate || 'Not published yet'}</p>
              </div>
            </div>
          </div>
        </div>

        {imageUrl ? (
          <figure className="border-t border-slate-200/80 bg-white/80">
            <img
              src={imageUrl}
              alt={recipe.title}
              className="h-[clamp(240px,38vw,460px)] w-full object-cover"
            />
            {recipe.featuredImageCaption?.trim() ? (
              <figcaption className="border-t border-slate-200/80 px-5 py-4 text-sm leading-6 text-slate-600 md:px-6">
                {recipe.featuredImageCaption.trim()}
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

            {recipe.introHtml?.trim() ? (
              <section className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
                <div
                  className="prose prose-lg max-w-none prose-headings:text-slate-950 prose-p:text-slate-700 prose-li:text-slate-700 prose-a:text-[var(--brand-accent)]"
                  dangerouslySetInnerHTML={{ __html: recipe.introHtml }}
                />
              </section>
            ) : null}

            {recipe.media.filter((item) => item.stepId === null).length > 0 ? (
              <section className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Gallery</p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {recipe.media
                    .filter((item) => item.stepId === null)
                    .map((item) => {
                      const displayUrl = getRecipeMediaDisplayUrl(item);
                      if (!displayUrl) return null;

                      return (
                        <figure key={item.id} className="overflow-hidden rounded-[20px] border border-slate-200 bg-slate-50">
                          {item.type === 'IMAGE' ? (
                            <img src={displayUrl} alt={item.altText || recipe.title} className="h-56 w-full object-cover" />
                          ) : (
                            <div className="aspect-video w-full">
                              <iframe
                                src={displayUrl}
                                title={item.caption || recipe.title}
                                className="h-full w-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                              />
                            </div>
                          )}
                          {item.caption?.trim() ? (
                            <figcaption className="px-4 py-3 text-sm leading-6 text-slate-600">{item.caption}</figcaption>
                          ) : null}
                        </figure>
                      );
                    })}
                </div>
              </section>
            ) : null}

            <section className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Method</p>
              <div className="mt-4 space-y-4">
                {recipe.instructionSteps.map((step, index) => (
                  <div
                    key={step.id}
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
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-7 text-slate-700">{step.body}</p>
                        {step.timerMinutes ? (
                          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand-accent)]">
                            Timer: {formatRecipeTimeLabel(step.timerMinutes)}
                          </p>
                        ) : null}
                        {step.media && step.media.length > 0 ? (
                          <div className="mt-4 grid gap-4 md:grid-cols-2">
                            {step.media.map((item) => {
                              const displayUrl = getRecipeMediaDisplayUrl(item);
                              if (!displayUrl) return null;

                              return (
                                <figure key={item.id} className="overflow-hidden rounded-[18px] border border-slate-200 bg-white">
                                  {item.type === 'IMAGE' ? (
                                    <img src={displayUrl} alt={item.altText || step.title || `Step ${index + 1}`} className="h-48 w-full object-cover" />
                                  ) : (
                                    <div className="aspect-video w-full">
                                      <iframe
                                        src={displayUrl}
                                        title={item.caption || step.title || `Step ${index + 1} video`}
                                        className="h-full w-full"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                        allowFullScreen
                                      />
                                    </div>
                                  )}
                                  {item.caption?.trim() ? (
                                    <figcaption className="px-4 py-3 text-sm leading-6 text-slate-600">{item.caption}</figcaption>
                                  ) : null}
                                </figure>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Ingredients</p>
              <div className="mt-4 space-y-5">
                {recipe.ingredientSections.map((section) => (
                  <div key={section.id} className="space-y-2">
                    {section.title?.trim() ? (
                      <h3 className="text-base font-bold uppercase tracking-[0.18em] text-[var(--brand-accent)]">
                        {section.title.trim()}
                      </h3>
                    ) : null}
                    <ul className="space-y-2">
                      {section.ingredients.map((ingredient) => (
                        <li
                          key={ingredient.id}
                          className="rounded-[18px] border border-slate-200/80 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700"
                        >
                          <span className="font-semibold text-slate-950">
                            {renderIngredientLine(ingredient)}
                          </span>
                          {ingredient.substitutionNote?.trim() ? (
                            <span className="block text-xs text-slate-500">
                              Swap: {ingredient.substitutionNote.trim()}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            {recipe.notes.length > 0 ? (
              <section className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Notes</p>
                <div className="mt-4 space-y-3">
                  {recipe.notes.map((note) => (
                    <div
                      key={note.id}
                      className="rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-4"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-700">
                        {note.title?.trim() || note.kind.replace(/_/g, ' ')}
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{note.body}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {(recipe.sourceName || recipe.sourceUrl) ? (
              <section className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Source</p>
                <p className="mt-3 text-sm leading-6 text-slate-700">
                  {recipe.sourceName || 'External source'}
                  {recipe.sourceUrl ? (
                    <>
                      {' '}
                      <a
                        href={recipe.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="font-semibold text-[var(--brand-accent)] underline"
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
