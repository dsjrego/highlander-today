'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
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
  parentCategory: { id: string; name: string; slug: string } | null;
}

interface GroupedCategories {
  parentName: string;
  children: Category[];
}

export default function SubmitArticlePage() {
  const router = useRouter();
  const { status: sessionStatus } = useSession();

  const [groupedCategories, setGroupedCategories] = useState<GroupedCategories[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    body: '',
    categoryId: '',
    tags: [] as string[],
    featuredImageUrl: '',
  });
  const [tagInput, setTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch all categories from DB and group subcategories by parent
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch('/api/categories');
        if (res.ok) {
          const data = await res.json();
          const allCats: Category[] = data.categories || [];

          // Only show subcategories (those with a parent), grouped by parent name
          const subcats = allCats.filter((c) => c.parentCategoryId && c.parentCategory);
          const grouped: Record<string, Category[]> = {};
          for (const cat of subcats) {
            const parentName = cat.parentCategory!.name;
            if (!grouped[parentName]) grouped[parentName] = [];
            grouped[parentName].push(cat);
          }

          // Convert to sorted array
          const result: GroupedCategories[] = Object.entries(grouped)
            .map(([parentName, children]) => ({ parentName, children }))
            .sort((a, b) => a.parentName.localeCompare(b.parentName));

          setGroupedCategories(result);

          if (result.length === 0) {
            console.warn('[Submit] No subcategories found — seed may need to run');
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
  }, []);

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
      const res = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          body: formData.body,
          excerpt: formData.excerpt || undefined,
          categoryId: formData.categoryId || undefined,
          featuredImageUrl: formData.featuredImageUrl || undefined,
          tags: formData.tags.length > 0 ? formData.tags : undefined,
          status: submitForReview ? 'PENDING_REVIEW' : 'DRAFT',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to save article');
        return;
      }

      await res.json();

      if (submitForReview) {
        setSuccessMessage('Article submitted for review! An editor will review it shortly.');
        setTimeout(() => router.push('/local-life/drafts'), 2000);
      } else {
        setSuccessMessage('Draft saved successfully!');
        setTimeout(() => router.push(`/local-life/drafts`), 1500);
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      saving(false);
    }
  }

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
        title="Local Life"
        titleClassName="text-white"
        actions={
          <button
            onClick={() => router.push('/local-life/drafts')}
            className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:opacity-90"
          >
            My Drafts
          </button>
        }
      />
      <p className="max-w-3xl text-sm leading-7 text-slate-500">
        Draft first, then submit when the story is clear, categorized, and ready for editor review.
      </p>

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

      <div className="rounded-[28px] border border-white/10 bg-white/82 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur space-y-6">
        {/* Title */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
            placeholder="Article title"
          />
        </div>

        {/* Excerpt */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Excerpt
            <span className="ml-2 text-xs font-normal text-slate-400">Brief summary shown on cards</span>
          </label>
          <textarea
            name="excerpt"
            value={formData.excerpt}
            onChange={handleInputChange}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
            rows={2}
            placeholder="Brief summary of your article (optional, but recommended)"
            maxLength={500}
          />
        </div>

        {/* Featured Image */}
        <ImageUpload
          label="Featured Image"
          helperText="Hero image shown at the top of your article"
          context="article"
          maxFiles={1}
          value={formData.featuredImageUrl ? [formData.featuredImageUrl] : []}
          onUpload={(img) => setFormData((prev) => ({ ...prev, featuredImageUrl: img.url }))}
          onRemove={() => setFormData((prev) => ({ ...prev, featuredImageUrl: '' }))}
        />

        {/* Category */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Category <span className="text-red-500">*</span>
            <span className="ml-2 text-xs font-normal text-slate-400">Required for submission</span>
          </label>
          <select
            name="categoryId"
            value={formData.categoryId}
            onChange={handleInputChange}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
          >
            <option value="">Select a category...</option>
            {groupedCategories.map((group) => (
              <optgroup key={group.parentName} label={group.parentName}>
                {group.children.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Tags */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Tags
            <span className="ml-2 text-xs font-normal text-slate-400">Press Enter to add</span>
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              className="flex-1 rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
              placeholder="Add a tag..."
            />
            <button
              type="button"
              onClick={addTag}
              className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
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
                    className="hover:text-red-200 ml-1"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Content — Rich Text Editor */}
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

        {/* Action Buttons */}
        <div className="flex gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={isSaving || isSubmitting}
            className="flex-1 rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save as Draft'}
          </button>
          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={isSaving || isSubmitting}
            className="flex-1 rounded-xl bg-slate-950 px-6 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Submit for Review'}
          </button>
        </div>
      </div>

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
