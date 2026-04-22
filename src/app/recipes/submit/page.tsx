'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import FormCard, { FormCardActions } from '@/components/shared/FormCard';
import ImageUpload from '@/components/shared/ImageUpload';
import InternalPageHeader from '@/components/shared/InternalPageHeader';
import RecipePreview from '@/components/recipes/RecipePreview';

const TipTapEditor = dynamic(
  () => import('@/components/articles/TipTapEditor'),
  { ssr: false, loading: () => <div className="h-[280px] animate-pulse rounded-[24px] border border-white/10 bg-white/70" /> }
);

type RecipeNoteKindValue = 'COOK_NOTE' | 'SUBSTITUTION' | 'STORAGE' | 'SERVING' | 'TROUBLESHOOTING';

interface Category {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
}

interface IngredientItem {
  amount: string;
  unit: string;
  ingredientName: string;
  preparationNote: string;
  isOptional: boolean;
  substitutionNote: string;
}

interface IngredientSection {
  title: string;
  items: IngredientItem[];
}

interface InstructionStep {
  title: string;
  body: string;
  timerMinutes: string;
  imageUrl: string;
  videoUrl: string;
  mediaCaption: string;
}

interface RecipeNoteInput {
  kind: RecipeNoteKindValue;
  title: string;
  body: string;
}

interface RecipeMediaInput {
  type: 'IMAGE' | 'VIDEO_EMBED';
  imageUrl: string;
  embedUrl: string;
  caption: string;
  altText: string;
}

const NOTE_KIND_OPTIONS: Array<{ value: RecipeNoteKindValue; label: string }> = [
  { value: 'COOK_NOTE', label: 'Cook Note' },
  { value: 'SUBSTITUTION', label: 'Substitution' },
  { value: 'STORAGE', label: 'Storage' },
  { value: 'SERVING', label: 'Serving' },
  { value: 'TROUBLESHOOTING', label: 'Troubleshooting' },
];

function createEmptyIngredient(): IngredientItem {
  return {
    amount: '',
    unit: '',
    ingredientName: '',
    preparationNote: '',
    isOptional: false,
    substitutionNote: '',
  };
}

function createEmptySection(): IngredientSection {
  return {
    title: '',
    items: [createEmptyIngredient()],
  };
}

function createEmptyStep(): InstructionStep {
  return {
    title: '',
    body: '',
    timerMinutes: '',
    imageUrl: '',
    videoUrl: '',
    mediaCaption: '',
  };
}

function createEmptyNote(): RecipeNoteInput {
  return {
    kind: 'COOK_NOTE',
    title: '',
    body: '',
  };
}

function createEmptyVideoMedia(): RecipeMediaInput {
  return {
    type: 'VIDEO_EMBED',
    imageUrl: '',
    embedUrl: '',
    caption: '',
    altText: '',
  };
}

export default function SubmitRecipePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  const requestedCategorySlug = searchParams.get('category')?.trim() || 'recipes-food';

  const [categoryOptions, setCategoryOptions] = useState<Category[]>([]);
  const [viewMode, setViewMode] = useState<'write' | 'preview'>('write');
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [jsonImport, setJsonImport] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    introHtml: '',
    categoryId: '',
    featuredImageUrl: '',
    featuredImageCaption: '',
    yieldLabel: '',
    servings: '',
    prepMinutes: '',
    cookMinutes: '',
    totalMinutes: '',
    sourceName: '',
    sourceUrl: '',
    ingredientSections: [createEmptySection()] as IngredientSection[],
    steps: [createEmptyStep()] as InstructionStep[],
    notes: [] as RecipeNoteInput[],
    media: [] as RecipeMediaInput[],
  });

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch('/api/categories?parent=local-life');
        if (!res.ok) {
          return;
        }

        const data = await res.json();
        const categories = (data.categories || []) as Category[];
        const ordered = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
        setCategoryOptions(ordered);

        const preferred = ordered.find((category) => category.slug === requestedCategorySlug);
        if (preferred) {
          setFormData((prev) => ({
            ...prev,
            categoryId: prev.categoryId || preferred.id,
          }));
        }
      } catch (fetchError) {
        console.error('Failed to fetch recipe categories:', fetchError);
      }
    }

    fetchCategories();
  }, [requestedCategorySlug]);

  function handleInputChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function updateIngredientSection(sectionIndex: number, nextSection: IngredientSection) {
    setFormData((prev) => ({
      ...prev,
      ingredientSections: prev.ingredientSections.map((section, index) =>
        index === sectionIndex ? nextSection : section
      ),
    }));
  }

  function updateStep(stepIndex: number, nextStep: InstructionStep) {
    setFormData((prev) => ({
      ...prev,
      steps: prev.steps.map((step, index) => (index === stepIndex ? nextStep : step)),
    }));
  }

  function updateNote(noteIndex: number, nextNote: RecipeNoteInput) {
    setFormData((prev) => ({
      ...prev,
      notes: prev.notes.map((note, index) => (index === noteIndex ? nextNote : note)),
    }));
  }

  async function handleImportJson() {
    setError('');
    setSuccessMessage('');
    setIsImporting(true);

    try {
      const res = await fetch('/api/recipes/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: jsonImport }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not import recipe JSON.');
        return;
      }

      const recipe = data.recipe;
      setFormData({
        title: recipe.title || '',
        excerpt: recipe.excerpt || '',
        introHtml: recipe.introHtml || '',
        categoryId: recipe.categoryId || formData.categoryId,
        featuredImageUrl: recipe.featuredImageUrl || '',
        featuredImageCaption: recipe.featuredImageCaption || '',
        yieldLabel: recipe.yieldLabel || '',
        servings: recipe.servings ? String(recipe.servings) : '',
        prepMinutes: recipe.prepMinutes !== undefined ? String(recipe.prepMinutes) : '',
        cookMinutes: recipe.cookMinutes !== undefined ? String(recipe.cookMinutes) : '',
        totalMinutes: recipe.totalMinutes !== undefined ? String(recipe.totalMinutes) : '',
        sourceName: recipe.sourceName || '',
        sourceUrl: recipe.sourceUrl || '',
        media:
          recipe.media?.filter((item: any) => !item.stepId).map((item: any) => ({
            type: item.type,
            imageUrl: item.imageUrl || '',
            embedUrl: item.embedUrl || '',
            caption: item.caption || '',
            altText: item.altText || '',
          })) || [],
        ingredientSections:
          recipe.ingredientSections?.length > 0
            ? recipe.ingredientSections.map((section: IngredientSection) => ({
                title: section.title || '',
                items:
                  section.items?.length > 0
                    ? section.items.map((item) => ({
                        amount: item.amount || '',
                        unit: item.unit || '',
                        ingredientName: item.ingredientName || '',
                        preparationNote: item.preparationNote || '',
                        isOptional: Boolean(item.isOptional),
                        substitutionNote: item.substitutionNote || '',
                      }))
                    : [createEmptyIngredient()],
              }))
            : [createEmptySection()],
        steps:
          recipe.steps?.length > 0
            ? recipe.steps.map((step: InstructionStep) => ({
                title: step.title || '',
                body: step.body || '',
                timerMinutes:
                  step.timerMinutes !== undefined && step.timerMinutes !== null
                    ? String(step.timerMinutes)
                    : '',
                imageUrl: (step as any).media?.find((item: any) => item.type === 'IMAGE')?.imageUrl || '',
                videoUrl: (step as any).media?.find((item: any) => item.type === 'VIDEO_EMBED')?.embedUrl || '',
                mediaCaption: (step as any).media?.find((item: any) => item.caption)?.caption || '',
              }))
            : [createEmptyStep()],
        notes:
          recipe.notes?.length > 0
            ? recipe.notes.map((note: RecipeNoteInput) => ({
                kind: note.kind,
                title: note.title || '',
                body: note.body || '',
              }))
            : [],
      });
      setSuccessMessage('Recipe JSON imported. Review the structured fields before saving.');
      setViewMode('write');
    } catch (importError) {
      console.error(importError);
      setError('Could not import recipe JSON.');
    } finally {
      setIsImporting(false);
    }
  }

  async function handleSave(submitForReview: boolean) {
    setError('');
    setSuccessMessage('');
    if (submitForReview) {
      setIsSubmitting(true);
    } else {
      setIsSaving(true);
    }

    try {
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          excerpt: formData.excerpt || undefined,
          introHtml: formData.introHtml || undefined,
          categoryId: formData.categoryId || undefined,
          featuredImageUrl: formData.featuredImageUrl || undefined,
          featuredImageCaption: formData.featuredImageCaption || undefined,
          yieldLabel: formData.yieldLabel || undefined,
          servings: formData.servings || undefined,
          prepMinutes: formData.prepMinutes || undefined,
          cookMinutes: formData.cookMinutes || undefined,
          totalMinutes: formData.totalMinutes || undefined,
          sourceName: formData.sourceName || undefined,
          sourceUrl: formData.sourceUrl || undefined,
          ingredientSections: formData.ingredientSections.map((section) => ({
            title: section.title || undefined,
            items: section.items.map((item) => ({
              amount: item.amount || undefined,
              unit: item.unit || undefined,
              ingredientName: item.ingredientName,
              preparationNote: item.preparationNote || undefined,
              isOptional: item.isOptional,
              substitutionNote: item.substitutionNote || undefined,
            })),
          })),
          steps: formData.steps.map((step) => ({
            title: step.title || undefined,
            body: step.body,
            timerMinutes: step.timerMinutes || undefined,
            imageUrl: step.imageUrl || undefined,
            videoUrl: step.videoUrl || undefined,
            mediaCaption: step.mediaCaption || undefined,
          })),
          notes: formData.notes.map((note) => ({
            kind: note.kind,
            title: note.title || undefined,
            body: note.body,
          })),
          media: formData.media.map((item) => ({
            type: item.type,
            imageUrl: item.imageUrl || undefined,
            embedUrl: item.embedUrl || undefined,
            caption: item.caption || undefined,
            altText: item.altText || undefined,
          })),
          status: submitForReview ? 'PENDING_REVIEW' : 'DRAFT',
          structuredInputRaw: jsonImport ? JSON.parse(jsonImport) : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save recipe.');
        return;
      }

      setSuccessMessage(
        submitForReview ? 'Recipe submitted for review.' : 'Recipe draft saved successfully.'
      );
      router.push(`/recipes/${data.id}`);
    } catch (saveError) {
      console.error(saveError);
      setError('Failed to save recipe.');
    } finally {
      setIsSaving(false);
      setIsSubmitting(false);
    }
  }

  const sessionName = session?.user?.name?.trim() || 'You';
  const nameParts = sessionName.split(/\s+/).filter(Boolean);
  const previewAuthor = session?.user
    ? {
        firstName: nameParts.slice(0, -1).join(' ') || nameParts[0] || 'You',
        lastName: nameParts.length > 1 ? nameParts[nameParts.length - 1] : '',
      }
    : null;

  const previewDate = useMemo(
    () =>
      new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    []
  );

  const selectedCategory = categoryOptions.find((category) => category.id === formData.categoryId);

  if (sessionStatus === 'loading') {
    return (
      <div className="rounded-[28px] border border-white/10 bg-white/70 px-6 py-20 text-center text-slate-500 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <InternalPageHeader
        title="Recipes"
        description="Build recipes from structured fields, then import JSON when you already have machine-friendly data."
      />

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>
      ) : null}
      {successMessage ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-700">
          {successMessage}
        </div>
      ) : null}

      <FormCard>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Recipe Editor</p>
            <h2 className="mt-1 text-xl font-bold text-slate-950">Structured recipe authoring</h2>
          </div>
          <div className="inline-flex rounded-full border border-slate-200 bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setViewMode('write')}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                viewMode === 'write' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'
              }`}
            >
              Writing
            </button>
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                viewMode === 'preview' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'
              }`}
            >
              Recipe Preview
            </button>
          </div>
        </div>

        {viewMode === 'write' ? (
          <div className="space-y-8">
            <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
              <div className="space-y-4">
                <ImageUpload
                  label="Featured Image"
                  helperText="Hero image shown at the top of the recipe"
                  labelClassName="form-label text-slate-500"
                  context="article"
                  maxFiles={1}
                  singleCard
                  value={formData.featuredImageUrl ? [formData.featuredImageUrl] : []}
                  onUpload={(img) => setFormData((prev) => ({ ...prev, featuredImageUrl: img.url }))}
                  onRemove={() =>
                    setFormData((prev) => ({
                      ...prev,
                      featuredImageUrl: '',
                      featuredImageCaption: '',
                    }))
                  }
                />

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Photo Caption</label>
                  <textarea
                    name="featuredImageCaption"
                    value={formData.featuredImageCaption}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-950 transition focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)]"
                    rows={3}
                    maxLength={300}
                  />
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Recipe JSON Import</label>
                  <textarea
                    value={jsonImport}
                    onChange={(e) => setJsonImport(e.target.value)}
                    spellCheck={false}
                    className="h-64 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-xs leading-6 text-slate-950 transition focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)]"
                    placeholder='{"title":"Sunday Pot Roast","ingredientSections":[...],"steps":[...]}'
                  />
                  <button
                    type="button"
                    onClick={handleImportJson}
                    disabled={isImporting || !jsonImport.trim()}
                    className="mt-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isImporting ? 'Importing...' : 'Import JSON'}
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="categoryId"
                      value={formData.categoryId}
                      onChange={handleInputChange}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 transition focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)]"
                    >
                      <option value="">Select a category...</option>
                      {categoryOptions.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 transition focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)]"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Excerpt</label>
                    <textarea
                      name="excerpt"
                      value={formData.excerpt}
                      onChange={handleInputChange}
                      rows={2}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 transition focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)]"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Yield</label>
                    <input
                      type="text"
                      name="yieldLabel"
                      value={formData.yieldLabel}
                      onChange={handleInputChange}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 transition focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)]"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Servings</label>
                    <input
                      type="number"
                      min={1}
                      name="servings"
                      value={formData.servings}
                      onChange={handleInputChange}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 transition focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)]"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Prep Minutes</label>
                    <input
                      type="number"
                      min={0}
                      name="prepMinutes"
                      value={formData.prepMinutes}
                      onChange={handleInputChange}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 transition focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)]"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Cook Minutes</label>
                    <input
                      type="number"
                      min={0}
                      name="cookMinutes"
                      value={formData.cookMinutes}
                      onChange={handleInputChange}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 transition focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)]"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Total Minutes</label>
                    <input
                      type="number"
                      min={0}
                      name="totalMinutes"
                      value={formData.totalMinutes}
                      onChange={handleInputChange}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 transition focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)]"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Intro / Story</label>
                    <TipTapEditor
                      content={formData.introHtml}
                      onChange={(html) => setFormData((prev) => ({ ...prev, introHtml: html }))}
                      placeholder="Write any editorial introduction for the recipe..."
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Source Name</label>
                    <input
                      type="text"
                      name="sourceName"
                      value={formData.sourceName}
                      onChange={handleInputChange}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 transition focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)]"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Source URL</label>
                    <input
                      type="url"
                      name="sourceUrl"
                      value={formData.sourceUrl}
                      onChange={handleInputChange}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 transition focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)]"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Recipe Media</p>
                  <h3 className="text-lg font-bold text-slate-950">Gallery photos and video embeds</h3>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
                <div>
                  <ImageUpload
                    label="Recipe Gallery Photos"
                    helperText="Additional photos using the current image storage path"
                    labelClassName="form-label text-slate-500"
                    context="article"
                    maxFiles={12}
                    value={formData.media.filter((item) => item.type === 'IMAGE').map((item) => item.imageUrl)}
                    onUpload={(img) =>
                      setFormData((prev) => ({
                        ...prev,
                        media: [
                          ...prev.media,
                          {
                            type: 'IMAGE',
                            imageUrl: img.url,
                            embedUrl: '',
                            caption: '',
                            altText: '',
                          },
                        ],
                      }))
                    }
                    onRemove={(url) =>
                      setFormData((prev) => ({
                        ...prev,
                        media: prev.media.filter((item) => !(item.type === 'IMAGE' && item.imageUrl === url)),
                      }))
                    }
                  />
                </div>

                <div className="space-y-4">
                  {formData.media.map((item, index) =>
                    item.type === 'IMAGE' ? (
                      <div key={`gallery-image-${index}`} className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                        <p className="mb-3 text-sm font-semibold text-slate-700">Gallery image details</p>
                        <div className="grid gap-3 md:grid-cols-2">
                          <input
                            type="text"
                            value={item.caption}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                media: prev.media.map((media, mediaIndex) =>
                                  mediaIndex === index ? { ...media, caption: e.target.value } : media
                                ),
                              }))
                            }
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 transition focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)]"
                            placeholder="Caption"
                          />
                          <input
                            type="text"
                            value={item.altText}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                media: prev.media.map((media, mediaIndex) =>
                                  mediaIndex === index ? { ...media, altText: e.target.value } : media
                                ),
                              }))
                            }
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 transition focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)]"
                            placeholder="Alt text"
                          />
                        </div>
                      </div>
                    ) : (
                      <div key={`gallery-video-${index}`} className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                        <div className="grid gap-3">
                          <input
                            type="url"
                            value={item.embedUrl}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                media: prev.media.map((media, mediaIndex) =>
                                  mediaIndex === index ? { ...media, embedUrl: e.target.value } : media
                                ),
                              }))
                            }
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 transition focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)]"
                            placeholder="YouTube or Vimeo URL"
                          />
                          <input
                            type="text"
                            value={item.caption}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                media: prev.media.map((media, mediaIndex) =>
                                  mediaIndex === index ? { ...media, caption: e.target.value } : media
                                ),
                              }))
                            }
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 transition focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)]"
                            placeholder="Video caption"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              media: prev.media.filter((_, mediaIndex) => mediaIndex !== index),
                            }))
                          }
                          className="mt-3 rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                        >
                          Remove Video
                        </button>
                      </div>
                    )
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        media: [...prev.media, createEmptyVideoMedia()],
                      }))
                    }
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    Add Video Embed
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Ingredients</p>
                  <h3 className="text-lg font-bold text-slate-950">Grouped ingredient sections</h3>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      ingredientSections: [...prev.ingredientSections, createEmptySection()],
                    }))
                  }
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Add Section
                </button>
              </div>

              {formData.ingredientSections.map((section, sectionIndex) => (
                <div key={`section-${sectionIndex}`} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <input
                      type="text"
                      value={section.title}
                      onChange={(e) =>
                        updateIngredientSection(sectionIndex, { ...section, title: e.target.value })
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 transition focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)]"
                      placeholder="Section title, e.g. Roast or Glaze"
                    />
                    {formData.ingredientSections.length > 1 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            ingredientSections: prev.ingredientSections.filter((_, index) => index !== sectionIndex),
                          }))
                        }
                        className="rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>

                  <div className="space-y-3">
                    {section.items.map((item, itemIndex) => (
                      <div key={`ingredient-${sectionIndex}-${itemIndex}`} className="rounded-[20px] border border-slate-200 bg-white p-4">
                        <div className="grid gap-3 md:grid-cols-[100px_110px_minmax(0,1fr)]">
                          <input
                            type="text"
                            value={item.amount}
                            onChange={(e) => {
                              const items = section.items.map((current, index) =>
                                index === itemIndex ? { ...current, amount: e.target.value } : current
                              );
                              updateIngredientSection(sectionIndex, { ...section, items });
                            }}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 transition focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)]"
                            placeholder="Amt"
                          />
                          <input
                            type="text"
                            value={item.unit}
                            onChange={(e) => {
                              const items = section.items.map((current, index) =>
                                index === itemIndex ? { ...current, unit: e.target.value } : current
                              );
                              updateIngredientSection(sectionIndex, { ...section, items });
                            }}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 transition focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)]"
                            placeholder="Unit"
                          />
                          <input
                            type="text"
                            value={item.ingredientName}
                            onChange={(e) => {
                              const items = section.items.map((current, index) =>
                                index === itemIndex ? { ...current, ingredientName: e.target.value } : current
                              );
                              updateIngredientSection(sectionIndex, { ...section, items });
                            }}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 transition focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)]"
                            placeholder="Ingredient name"
                          />
                        </div>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <input
                            type="text"
                            value={item.preparationNote}
                            onChange={(e) => {
                              const items = section.items.map((current, index) =>
                                index === itemIndex ? { ...current, preparationNote: e.target.value } : current
                              );
                              updateIngredientSection(sectionIndex, { ...section, items });
                            }}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 transition focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)]"
                            placeholder="Prep note, e.g. diced"
                          />
                          <input
                            type="text"
                            value={item.substitutionNote}
                            onChange={(e) => {
                              const items = section.items.map((current, index) =>
                                index === itemIndex ? { ...current, substitutionNote: e.target.value } : current
                              );
                              updateIngredientSection(sectionIndex, { ...section, items });
                            }}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 transition focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)]"
                            placeholder="Substitution note"
                          />
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                            <input
                              type="checkbox"
                              checked={item.isOptional}
                              onChange={(e) => {
                                const items = section.items.map((current, index) =>
                                  index === itemIndex ? { ...current, isOptional: e.target.checked } : current
                                );
                                updateIngredientSection(sectionIndex, { ...section, items });
                              }}
                              className="h-4 w-4 rounded border-slate-300 text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                            />
                            Optional ingredient
                          </label>
                          {section.items.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => {
                                const items = section.items.filter((_, index) => index !== itemIndex);
                                updateIngredientSection(sectionIndex, { ...section, items });
                              }}
                              className="rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                            >
                              Remove Item
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      updateIngredientSection(sectionIndex, {
                        ...section,
                        items: [...section.items, createEmptyIngredient()],
                      })
                    }
                    className="mt-4 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                  >
                    Add Ingredient
                  </button>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Method</p>
                  <h3 className="text-lg font-bold text-slate-950">Instruction steps</h3>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      steps: [...prev.steps, createEmptyStep()],
                    }))
                  }
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Add Step
                </button>
              </div>

              {formData.steps.map((step, stepIndex) => (
                <div key={`step-${stepIndex}`} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px]">
                    <input
                      type="text"
                      value={step.title}
                      onChange={(e) => updateStep(stepIndex, { ...step, title: e.target.value })}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 transition focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)]"
                      placeholder={`Step ${stepIndex + 1} title`}
                    />
                    <input
                      type="number"
                      min={1}
                      value={step.timerMinutes}
                      onChange={(e) => updateStep(stepIndex, { ...step, timerMinutes: e.target.value })}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 transition focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)]"
                      placeholder="Timer min"
                    />
                  </div>
                  <textarea
                    value={step.body}
                    onChange={(e) => updateStep(stepIndex, { ...step, body: e.target.value })}
                    className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-950 transition focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)]"
                    rows={4}
                    placeholder="Describe this step..."
                  />
                  <div className="mt-4 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
                    <div>
                      <ImageUpload
                        label={`Step ${stepIndex + 1} Photo`}
                        helperText="Optional process photo stored through the current image upload path"
                        labelClassName="form-label text-slate-500"
                        context="article"
                        maxFiles={1}
                        singleCard
                        value={step.imageUrl ? [step.imageUrl] : []}
                        onUpload={(img) => updateStep(stepIndex, { ...step, imageUrl: img.url })}
                        onRemove={() => updateStep(stepIndex, { ...step, imageUrl: '' })}
                      />
                    </div>
                    <div className="space-y-3">
                      <input
                        type="url"
                        value={step.videoUrl}
                        onChange={(e) => updateStep(stepIndex, { ...step, videoUrl: e.target.value })}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 transition focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)]"
                        placeholder="Optional YouTube or Vimeo URL"
                      />
                      <input
                        type="text"
                        value={step.mediaCaption}
                        onChange={(e) => updateStep(stepIndex, { ...step, mediaCaption: e.target.value })}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 transition focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)]"
                        placeholder="Optional step media caption"
                      />
                    </div>
                  </div>
                  {formData.steps.length > 1 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          steps: prev.steps.filter((_, index) => index !== stepIndex),
                        }))
                      }
                      className="mt-3 rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                    >
                      Remove Step
                    </button>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Notes</p>
                  <h3 className="text-lg font-bold text-slate-950">Cook notes, substitutions, storage</h3>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      notes: [...prev.notes, createEmptyNote()],
                    }))
                  }
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Add Note
                </button>
              </div>

              {formData.notes.length > 0 ? (
                formData.notes.map((note, noteIndex) => (
                  <div key={`note-${noteIndex}`} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <div className="grid gap-3 md:grid-cols-[200px_minmax(0,1fr)]">
                      <select
                        value={note.kind}
                        onChange={(e) =>
                          updateNote(noteIndex, { ...note, kind: e.target.value as RecipeNoteKindValue })
                        }
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 transition focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)]"
                      >
                        {NOTE_KIND_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={note.title}
                        onChange={(e) => updateNote(noteIndex, { ...note, title: e.target.value })}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 transition focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)]"
                        placeholder="Optional note title"
                      />
                    </div>
                    <textarea
                      value={note.body}
                      onChange={(e) => updateNote(noteIndex, { ...note, body: e.target.value })}
                      className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-950 transition focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)]"
                      rows={3}
                      placeholder="Explain the note..."
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          notes: prev.notes.filter((_, index) => index !== noteIndex),
                        }))
                      }
                      className="mt-3 rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                    >
                      Remove Note
                    </button>
                  </div>
                ))
              ) : (
                <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-sm text-slate-500">
                  Add notes only when the recipe needs substitutions, serving guidance, or storage instructions.
                </div>
              )}
            </div>
          </div>
        ) : (
          <RecipePreview
            title={formData.title}
            excerpt={formData.excerpt}
            introHtml={formData.introHtml}
            featuredImageUrl={formData.featuredImageUrl}
            featuredImageCaption={formData.featuredImageCaption}
            categoryName={selectedCategory?.name}
            author={previewAuthor}
            publishedLabel={previewDate}
            yieldLabel={formData.yieldLabel}
            servings={formData.servings ? Number(formData.servings) : undefined}
            prepMinutes={formData.prepMinutes ? Number(formData.prepMinutes) : undefined}
            cookMinutes={formData.cookMinutes ? Number(formData.cookMinutes) : undefined}
            totalMinutes={formData.totalMinutes ? Number(formData.totalMinutes) : undefined}
            ingredientSections={formData.ingredientSections}
            steps={formData.steps
              .filter((step) => step.body.trim())
              .map((step) => ({
                ...step,
                timerMinutes: step.timerMinutes ? Number(step.timerMinutes) : undefined,
              }))}
            notes={formData.notes.filter((note) => note.body.trim())}
            media={formData.media
              .filter((item) => item.imageUrl.trim() || item.embedUrl.trim())
              .map((item) => ({
                type: item.type,
                imageUrl: item.imageUrl || undefined,
                embedUrl: item.embedUrl || undefined,
                caption: item.caption || undefined,
                altText: item.altText || undefined,
              }))}
            sourceName={formData.sourceName}
            sourceUrl={formData.sourceUrl}
          />
        )}

        <FormCardActions className="mt-6 border-t border-slate-200/80 pt-4">
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={isSaving || isSubmitting}
            className="btn btn-neutral"
          >
            {isSaving ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={isSaving || isSubmitting}
            className="btn btn-primary"
          >
            {isSubmitting ? 'Submitting...' : 'Submit for Review'}
          </button>
        </FormCardActions>
      </FormCard>
    </div>
  );
}
