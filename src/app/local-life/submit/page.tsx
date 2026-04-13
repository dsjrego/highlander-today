'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import ArticlePreview from '@/components/articles/ArticlePreview';
import FormCard, { FormCardActions } from '@/components/shared/FormCard';
import ImageUpload from '@/components/shared/ImageUpload';
import InternalPageHeader from '@/components/shared/InternalPageHeader';

// Dynamic import to avoid SSR issues with TipTap (ProseMirror needs DOM)
const TipTapEditor = dynamic(
  () => import('@/components/articles/TipTapEditor'),
  { ssr: false, loading: () => <div className="h-[380px] animate-pulse rounded-[24px] border border-white/10 bg-white/70" /> }
);

interface Category {
  id: string;
  name: string;
  slug: string;
  parentCategoryId: string | null;
  sortOrder: number;
  parentCategory: { id: string; name: string; slug: string } | null;
}

interface FormCategoryOption {
  id: string;
  label: string;
  slug: string;
}

export default function SubmitArticlePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  const parentSlug = searchParams.get('parent')?.trim() || 'local-life';
  const requestedCategorySlug = searchParams.get('category')?.trim() || '';
  const editArticleId = searchParams.get('edit')?.trim() || '';
  const isEditMode = Boolean(editArticleId);

  const [categoryOptions, setCategoryOptions] = useState<FormCategoryOption[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    body: '',
    categoryId: '',
    tags: [] as string[],
    featuredImageUrl: '',
    featuredImageCaption: '',
  });
  const [tagInput, setTagInput] = useState('');
  const [viewMode, setViewMode] = useState<'write' | 'preview'>('write');
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingArticle, setIsLoadingArticle] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loadedArticleStatus, setLoadedArticleStatus] = useState<
    'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'UNPUBLISHED' | ''
  >('');

  // Fetch category options for the current parent context and preselect the requested child category.
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch(`/api/categories?parent=${encodeURIComponent(parentSlug)}`);
        if (res.ok) {
          const data = await res.json();
          const allCats: Category[] = data.categories || [];
          const orderedOptions = allCats
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((category) => ({
              id: category.id,
              label: category.name,
              slug: category.slug,
            }));

          setCategoryOptions(orderedOptions);
          if (requestedCategorySlug) {
            const requested = orderedOptions.find((category) => category.slug === requestedCategorySlug);
            if (requested) {
              setFormData((prev) => ({
                ...prev,
                categoryId: prev.categoryId || requested.id,
              }));
            }
          }

          if (orderedOptions.length === 0) {
            console.warn(`[Submit] No categories found for parent "${parentSlug}"`);
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          console.error('[Submit] Categories fetch failed:', res.status, errData);
          setError(`Could not load categories (${res.status}). Check the server console.`);
        }
      } catch (err) {
        console.error('[Submit] Failed to fetch categories:', err);
        setError('Could not load categories. Make sure the dev server is running.');
      }
    }
    fetchCategories();
  }, [parentSlug, requestedCategorySlug]);

  useEffect(() => {
    if (!editArticleId) return;

    let isCancelled = false;

    async function fetchArticleForEdit() {
      setIsLoadingArticle(true);
      setError('');

      try {
        const res = await fetch(`/api/articles/${editArticleId}`);
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          if (!isCancelled) {
            setError(data.error || 'Failed to load article for editing');
          }
          return;
        }

        if (isCancelled) return;

        setFormData({
          title: data.title || '',
          excerpt: data.excerpt || '',
          body: data.body || '',
          categoryId: data.category?.id || '',
          tags: Array.isArray(data.tags) ? data.tags.map((entry: { tag?: { name?: string } }) => entry.tag?.name).filter(Boolean) : [],
          featuredImageUrl: data.featuredImageUrl || '',
          featuredImageCaption: data.featuredImageCaption || '',
        });
        setLoadedArticleStatus(data.status || '');
      } catch {
        if (!isCancelled) {
          setError('Failed to load article for editing');
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingArticle(false);
        }
      }
    }

    fetchArticleForEdit();

    return () => {
      isCancelled = true;
    };
  }, [editArticleId]);

  function handleInputChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function addTag() {
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
      setTagInput('');
    }
  }

  function removeTag(tag: string) {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  }

  function handleTagKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  }

  /**
   * Save as DRAFT or submit directly as PENDING_REVIEW
   */
  async function handleSave(submitForReview: boolean) {
    setError('');
    setSuccessMessage('');

    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }
    // Strip HTML tags for length validation
    const textContent = formData.body.replace(/<[^>]*>/g, '').trim();
    if (!textContent || textContent.length < 10) {
      setError('Content must be at least 10 characters');
      return;
    }
    if (submitForReview && !formData.categoryId) {
      setError('Please select a category before submitting for review');
      return;
    }

    const saving = submitForReview ? setIsSubmitting : setIsSaving;
    saving(true);

    try {
      const res = await fetch(isEditMode ? `/api/articles/${editArticleId}` : '/api/articles', {
        method: isEditMode ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          body: formData.body,
          excerpt: formData.excerpt || undefined,
          categoryId: formData.categoryId || undefined,
          featuredImageUrl: formData.featuredImageUrl || undefined,
          featuredImageCaption: formData.featuredImageCaption.trim() || undefined,
          tags: formData.tags.length > 0 ? formData.tags : undefined,
          ...(submitForReview ? { status: 'PENDING_REVIEW' } : {}),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to save article');
        return;
      }

      const savedArticle = await res.json();
      const nextStatus = savedArticle?.status || (submitForReview ? 'PENDING_REVIEW' : loadedArticleStatus);
      setLoadedArticleStatus(nextStatus);

      if (submitForReview) {
        setSuccessMessage(
          isEditMode
            ? 'Article updated and submitted for review.'
            : 'Article submitted for review! An editor will review it shortly.'
        );
        setTimeout(() => {
          if ((session?.user as { role?: string } | undefined)?.role && ['EDITOR', 'ADMIN', 'SUPER_ADMIN'].includes((session?.user as { role?: string }).role || '')) {
            router.push(`/admin/articles/${editArticleId || savedArticle.id}`);
            return;
          }
          router.push('/local-life/drafts');
        }, 1500);
      } else {
        setSuccessMessage(
          isEditMode
            ? nextStatus === 'DRAFT'
              ? 'Article changes saved. The article is now in draft.'
              : 'Article changes saved.'
            : 'Draft saved successfully!'
        );
        setTimeout(() => {
          if (isEditMode && (session?.user as { role?: string } | undefined)?.role && ['EDITOR', 'ADMIN', 'SUPER_ADMIN'].includes((session?.user as { role?: string }).role || '')) {
            router.push(`/admin/articles/${editArticleId}`);
            return;
          }
          router.push(`/local-life/drafts`);
        }, 1500);
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      saving(false);
    }
  }

  if (sessionStatus === 'loading' || isLoadingArticle) {
    return (
      <div className="rounded-[28px] border border-white/10 bg-white/70 px-6 py-20 text-center text-slate-500 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
        Loading...
      </div>
    );
  }

  const sessionName = session?.user?.name?.trim() || 'You';
  const nameParts = sessionName.split(/\s+/).filter(Boolean);
  const previewAuthor = session?.user
    ? {
        firstName: nameParts.slice(0, -1).join(' ') || nameParts[0] || 'You',
        lastName: nameParts.length > 1 ? nameParts[nameParts.length - 1] : '',
      }
    : null;
  const selectedCategory = categoryOptions.find((category) => category.id === formData.categoryId);
  const previewDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-8">
      <InternalPageHeader
        title={isEditMode ? 'Edit Article' : 'Local Life'}
        description={
          isEditMode
            ? 'Update the article, preview the reader-facing result, and save or resubmit as needed.'
            : 'Draft first, then submit when the story is clear, categorized, and ready for editor review.'
        }
        titleClassName="text-white"
        actions={
          <button
            onClick={() => {
              const userId = (session?.user as { id?: string } | undefined)?.id;
              router.push(userId ? `/profile/${userId}?tab=articles` : '/profile');
            }}
            aria-label="My articles"
            title="My articles"
            className="page-header-action"
          >
            <svg
              aria-hidden="true"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path strokeLinecap="round" d="M6 5.5h8" />
              <path strokeLinecap="round" d="M6 10h8" />
              <path strokeLinecap="round" d="M6 14.5h8" />
              <circle cx="3.5" cy="5.5" r="0.75" fill="currentColor" stroke="none" />
              <circle cx="3.5" cy="10" r="0.75" fill="currentColor" stroke="none" />
              <circle cx="3.5" cy="14.5" r="0.75" fill="currentColor" stroke="none" />
            </svg>
            <span className="page-header-action-label">My Articles</span>
          </button>
        }
      />

      {/* Messages */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-700">
          {successMessage}
        </div>
      )}

      <FormCard>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
              Editor
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-950">Write and preview your article</h2>
            {isEditMode ? (
              <p className="mt-1 text-sm text-slate-500">
                Current status: {loadedArticleStatus ? loadedArticleStatus.replace('_', ' ') : 'Loading'}
              </p>
            ) : null}
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
              Article Preview
            </button>
          </div>
        </div>

        {viewMode === 'write' ? (
          <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <div>
              <ImageUpload
                label="Featured Image"
                helperText="Hero image shown at the top of your article"
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
              {formData.featuredImageUrl ? (
                <div className="mt-4">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Photo Caption
                    <span className="ml-2 text-xs font-normal text-slate-400">
                      Optional credit or context shown below the image
                    </span>
                  </label>
                  <textarea
                    name="featuredImageCaption"
                    value={formData.featuredImageCaption}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] transition focus:border-[#46A8CC] focus:outline-none focus:ring-2 focus:ring-[#46A8CC]/30"
                    rows={3}
                    maxLength={300}
                    placeholder="Photo by..., or a short caption explaining what readers are seeing."
                  />
                </div>
              ) : null}
            </div>

            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Category <span className="text-red-500">*</span>
                  <span className="ml-2 text-xs font-normal text-slate-400">Required for submission</span>
                </label>
                <select
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleInputChange}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] transition focus:border-[#46A8CC] focus:outline-none focus:ring-2 focus:ring-[#46A8CC]/30"
                >
                  <option value="">Select a category...</option>
                  {categoryOptions.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] transition focus:border-[#46A8CC] focus:outline-none focus:ring-2 focus:ring-[#46A8CC]/30"
                  placeholder="Article title"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Excerpt
                  <span className="ml-2 text-xs font-normal text-slate-400">Brief summary shown on cards</span>
                </label>
                <textarea
                  name="excerpt"
                  value={formData.excerpt}
                  onChange={handleInputChange}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] transition focus:border-[#46A8CC] focus:outline-none focus:ring-2 focus:ring-[#46A8CC]/30"
                  rows={2}
                  placeholder="Brief summary of your article (optional, but recommended)"
                  maxLength={500}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Content <span className="text-red-500">*</span>
                </label>
                <TipTapEditor
                  content={formData.body}
                  onChange={(html) => setFormData((prev) => ({ ...prev, body: html }))}
                  placeholder="Write your article here..."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Tags
                  <span className="ml-2 text-xs font-normal text-slate-400">Press Enter to add</span>
                </label>
                <div className="mb-2 flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] transition focus:border-[#46A8CC] focus:outline-none focus:ring-2 focus:ring-[#46A8CC]/30"
                    placeholder="Add a tag..."
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    Add
                  </button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full bg-slate-950 px-3 py-1 text-xs font-medium text-white"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:text-red-200"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <ArticlePreview
            title={formData.title}
            excerpt={formData.excerpt}
            body={formData.body}
            featuredImageUrl={formData.featuredImageUrl}
            featuredImageCaption={formData.featuredImageCaption}
            categoryName={selectedCategory?.label}
            tags={formData.tags}
            author={previewAuthor}
            publishedLabel={previewDate}
          />
        )}

        <FormCardActions className="mt-6 border-t border-slate-200/80 pt-4">
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={isSaving || isSubmitting}
            className="btn btn-neutral"
          >
            {isSaving ? 'Saving...' : isEditMode ? 'Save Changes' : 'Save as Draft'}
          </button>
          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={isSaving || isSubmitting}
            className="btn btn-primary"
          >
            {isSubmitting ? 'Submitting...' : isEditMode ? 'Save and Submit for Review' : 'Submit for Review'}
          </button>
        </FormCardActions>
      </FormCard>

      {/* Guidelines */}
      <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(160deg,rgba(17,34,52,0.97),rgba(8,20,33,0.97))] p-4 text-sm text-white shadow-[0_24px_55px_rgba(7,17,26,0.18)]">
        <p className="mb-2 font-semibold text-cyan-100/74">Submission Guidelines</p>
        <ul className="space-y-1 list-disc list-inside text-xs">
          <li>Submissions must be original or properly attributed</li>
          <li>Be respectful and follow community guidelines</li>
          <li>Provide accurate information — this is your community&apos;s trust at stake</li>
          <li>All submissions are reviewed by an editor before publishing</li>
          <li>You can save a draft and come back to finish it later</li>
        </ul>
      </div>
    </div>
  );
}
