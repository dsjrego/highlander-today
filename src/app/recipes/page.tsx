'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import InternalPageHeader from '@/components/shared/InternalPageHeader';
import { getArticleUiImageUrl } from '@/lib/article-images';
import { formatRecipeTimeLabel } from '@/lib/recipes';

interface RecipeCard {
  id: string;
  title: string;
  excerpt: string | null;
  featuredImageUrl: string | null;
  category: { name: string } | null;
  totalMinutes: number | null;
  servings: number | null;
}

export default function RecipesPage() {
  const { data: session } = useSession();
  const [recipes, setRecipes] = useState<RecipeCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchRecipes() {
      try {
        const res = await fetch('/api/recipes');
        if (res.ok) {
          const data = await res.json();
          setRecipes(data.recipes || []);
        }
      } catch (error) {
        console.error('Failed to fetch recipes:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRecipes();
  }, []);

  return (
    <div className="space-y-6">
      <InternalPageHeader
        title="Recipes"
        description="Structured recipes with reusable ingredients, method steps, and visually deliberate presentation."
        actions={
          session?.user ? (
            <Link href="/recipes/submit" className="page-header-action" aria-label="Create recipe" title="Create recipe">
              <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" d="M10 4.5v11" />
                <path strokeLinecap="round" d="M4.5 10h11" />
              </svg>
              <span className="page-header-action-label">Add Recipe</span>
            </Link>
          ) : null
        }
      />

      {isLoading ? (
        <div className="rounded-[28px] border border-white/10 bg-white/70 px-6 py-20 text-center text-slate-500 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
          Loading recipes...
        </div>
      ) : recipes.length === 0 ? (
        <div className="rounded-[28px] border border-white/10 bg-white/70 px-6 py-20 text-center text-slate-500 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
          No recipes have been published yet.
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {recipes.map((recipe) => {
            const imageUrl = getArticleUiImageUrl(recipe.featuredImageUrl);

            return (
              <Link
                key={recipe.id}
                href={`/recipes/${recipe.id}`}
                className="overflow-hidden rounded-[28px] border border-white/10 bg-white/85 shadow-[0_18px_42px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_26px_55px_rgba(15,23,42,0.14)]"
              >
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl} alt={recipe.title} className="h-56 w-full object-cover" />
                ) : (
                  <div className="flex h-56 items-end bg-[linear-gradient(145deg,rgba(143,29,44,0.96),rgba(10,32,51,0.94))] p-6 text-white">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100/72">
                      {recipe.category?.name || 'Recipe'}
                    </p>
                  </div>
                )}
                <div className="space-y-3 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-400">
                    {recipe.category?.name || 'Recipe'}
                  </p>
                  <h2 className="text-2xl font-black tracking-[-0.03em] text-slate-950">{recipe.title}</h2>
                  {recipe.excerpt?.trim() ? (
                    <p className="text-sm leading-7 text-slate-600">{recipe.excerpt}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-accent)]">
                    {recipe.totalMinutes ? <span>{formatRecipeTimeLabel(recipe.totalMinutes)}</span> : null}
                    {recipe.servings ? <span>{recipe.servings} servings</span> : null}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
