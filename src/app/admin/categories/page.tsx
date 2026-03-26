'use client';

import { useEffect, useMemo, useState } from 'react';
import FormCard, { FormCardActions } from '@/components/shared/FormCard';

type CategoryRecord = {
  id: string;
  name: string;
  slug: string;
  parentCategoryId: string | null;
  sortOrder: number;
  isArchived: boolean;
  parentCategory: {
    id: string;
    name: string;
    slug: string;
  } | null;
  _count: {
    articles: number;
    childCategories: number;
  };
};

type EditableCategory = Record<
  string,
  {
    name: string;
    slug: string;
    sortOrder: number;
    isArchived: boolean;
    parentCategoryId: string | null;
  }
>;

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function sortCategories<T extends { sortOrder: number; name: string }>(categories: T[]) {
  return [...categories].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export default function CategoryManagerPage() {
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [editable, setEditable] = useState<EditableCategory>({});
  const [newCategory, setNewCategory] = useState({
    name: '',
    slug: '',
    parentCategoryId: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadCategories() {
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/categories');
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to load categories');
        return;
      }

      const nextCategories = sortCategories((data.categories || []) as CategoryRecord[]);
      setCategories(nextCategories);
      setEditable(
        Object.fromEntries(
          nextCategories.map((category: CategoryRecord) => [
            category.id,
            {
              name: category.name,
              slug: category.slug,
              sortOrder: category.sortOrder,
              isArchived: category.isArchived,
              parentCategoryId: category.parentCategoryId,
            },
          ])
        )
      );
    } catch {
      setError('Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  const topLevelCategories = useMemo(
    () => sortCategories(categories.filter((category) => category.parentCategoryId === null)),
    [categories]
  );

  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories]
  );

  const childrenByParentId = useMemo(() => {
    return categories.reduce<Record<string, CategoryRecord[]>>((acc, category) => {
      if (!category.parentCategoryId) return acc;
      if (!acc[category.parentCategoryId]) acc[category.parentCategoryId] = [];
      acc[category.parentCategoryId].push(category);
      acc[category.parentCategoryId] = sortCategories(acc[category.parentCategoryId]);
      return acc;
    }, {});
  }, [categories]);

  const descendantsById = useMemo(() => {
    const map = new Map<string, Set<string>>();

    function collect(categoryId: string): Set<string> {
      if (map.has(categoryId)) return map.get(categoryId)!;
      const descendants = new Set<string>();
      for (const child of childrenByParentId[categoryId] || []) {
        descendants.add(child.id);
        for (const nested of collect(child.id)) {
          descendants.add(nested);
        }
      }
      map.set(categoryId, descendants);
      return descendants;
    }

    for (const category of categories) {
      collect(category.id);
    }

    return map;
  }, [categories, childrenByParentId]);

  async function handleCreateCategory(event: React.FormEvent) {
    event.preventDefault();
    setIsCreating(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCategory.name,
          slug: newCategory.slug || slugify(newCategory.name),
          parentCategoryId: newCategory.parentCategoryId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create category');
        return;
      }

      setSuccess('Category created');
      setNewCategory({ name: '', slug: '', parentCategoryId: '' });
      await loadCategories();
    } catch {
      setError('Failed to create category');
    } finally {
      setIsCreating(false);
    }
  }

  function updateDraft(categoryId: string, changes: Partial<EditableCategory[string]>) {
    setEditable((current) => ({
      ...current,
      [categoryId]: {
        ...current[categoryId],
        ...changes,
      },
    }));
  }

  async function moveCategory(categoryId: string, direction: 'up' | 'down') {
    const draft = editable[categoryId];
    if (!draft) return;

    const siblings = sortCategories(
      categories.filter((category) => category.parentCategoryId === draft.parentCategoryId)
    );
    const currentIndex = siblings.findIndex((category) => category.id === categoryId);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= siblings.length) return;

    const target = siblings[targetIndex];
    const targetDraft = editable[target.id];
    if (!targetDraft) return;

    const originalDraft = draft;

    updateDraft(categoryId, { sortOrder: targetDraft.sortOrder });
    updateDraft(target.id, { sortOrder: draft.sortOrder });

    setIsReordering(categoryId);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/admin/categories/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: [
            { id: categoryId, sortOrder: targetDraft.sortOrder },
            { id: target.id, sortOrder: originalDraft.sortOrder },
          ],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        updateDraft(categoryId, { sortOrder: originalDraft.sortOrder });
        updateDraft(target.id, { sortOrder: targetDraft.sortOrder });
        setError(data.error || 'Failed to reorder category');
        return;
      }

      setSuccess('Category order updated');
      await loadCategories();
    } catch {
      updateDraft(categoryId, { sortOrder: originalDraft.sortOrder });
      updateDraft(target.id, { sortOrder: targetDraft.sortOrder });
      setError('Failed to reorder category');
    } finally {
      setIsReordering(null);
    }
  }

  async function handleSaveCategory(categoryId: string) {
    const draft = editable[categoryId];
    if (!draft) return;

    setIsSaving(categoryId);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/admin/categories/${categoryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draft.name,
          slug: draft.slug || slugify(draft.name),
          sortOrder: draft.sortOrder,
          isArchived: draft.isArchived,
          parentCategoryId: draft.parentCategoryId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to update category');
        return;
      }

      setSuccess('Category updated');
      await loadCategories();
    } catch {
      setError('Failed to update category');
    } finally {
      setIsSaving(null);
    }
  }

  function CategoryEditorRow({ category }: { category: CategoryRecord }) {
    const draft = editable[category.id];
    if (!draft) return null;

    const siblingCategories = sortCategories(
      categories.filter((candidate) => candidate.parentCategoryId === draft.parentCategoryId)
    );
    const siblingIndex = siblingCategories.findIndex((candidate) => candidate.id === category.id);
    const disallowedParentIds = descendantsById.get(category.id) ?? new Set<string>();

    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_200px_120px_auto]">
          <input
            type="text"
            value={draft.name}
            onChange={(event) => {
              const name = event.target.value;
              updateDraft(category.id, { name, slug: slugify(name) });
            }}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950"
          />
          <input
            type="text"
            value={draft.slug}
            onChange={(event) => updateDraft(category.id, { slug: slugify(event.target.value) })}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950"
          />
          <select
            value={draft.parentCategoryId ?? ''}
            onChange={(event) =>
              updateDraft(category.id, {
                parentCategoryId: event.target.value || null,
              })
            }
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950"
          >
            <option value="">Top-level category</option>
            {topLevelCategories
              .filter((candidate) => candidate.id !== category.id && !disallowedParentIds.has(candidate.id))
              .map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name}
                </option>
              ))}
          </select>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => moveCategory(category.id, 'up')}
              disabled={siblingIndex <= 0 || isReordering === category.id}
              className="btn btn-neutral min-w-0 px-3"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => moveCategory(category.id, 'down')}
              disabled={siblingIndex === -1 || siblingIndex >= siblingCategories.length - 1 || isReordering === category.id}
              className="btn btn-neutral min-w-0 px-3"
            >
              ↓
            </button>
          </div>
          <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={!draft.isArchived}
              onChange={(event) => updateDraft(category.id, { isArchived: !event.target.checked })}
              className="h-4 w-4 rounded border-slate-300"
            />
            Active
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Parent: {draft.parentCategoryId ? categoriesById.get(draft.parentCategoryId)?.name ?? 'Unknown' : 'Top-level'}
            {' · '}
            Order: {draft.sortOrder}
            {' · '}
            Articles: {category._count.articles}
            {' · '}
            Children: {category._count.childCategories}
          </p>
          <button
            type="button"
            onClick={() => handleSaveCategory(category.id)}
            disabled={isSaving === category.id}
            className="btn btn-primary"
          >
            {isSaving === category.id ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-[#46A8CC]">Category Management</h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
          Maintain the DB-backed category taxonomy, reassign parents, and reorder the hierarchy that powers Local Life and related surfaces.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>
      ) : null}
      {success ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-700">{success}</div>
      ) : null}

      <FormCard>
        <form onSubmit={handleCreateCategory} className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Add Category</h2>
            <p className="mt-1 text-sm text-slate-600">
              New categories are written directly to the database and invalidate cached category reads automatically.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Name</label>
              <input
                type="text"
                value={newCategory.name}
                onChange={(event) =>
                  setNewCategory((current) => ({
                    ...current,
                    name: event.target.value,
                    slug: slugify(event.target.value),
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950"
                placeholder="Category name"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Slug</label>
              <input
                type="text"
                value={newCategory.slug}
                onChange={(event) =>
                  setNewCategory((current) => ({
                    ...current,
                    slug: slugify(event.target.value),
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950"
                placeholder="category-slug"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Parent</label>
              <select
                value={newCategory.parentCategoryId}
                onChange={(event) =>
                  setNewCategory((current) => ({
                    ...current,
                    parentCategoryId: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950"
              >
                <option value="">Top-level category</option>
                {topLevelCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <FormCardActions>
            <button type="submit" disabled={isCreating} className="btn btn-primary">
              {isCreating ? 'Creating...' : 'Add Category'}
            </button>
          </FormCardActions>
        </form>
      </FormCard>

      <div className="space-y-6">
        {isLoading ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center text-slate-500">
            Loading categories...
          </div>
        ) : (
          <>
            <FormCard>
              <div className="space-y-5">
                <div className="border-b border-slate-200/80 pb-4">
                  <h2 className="text-2xl font-bold text-slate-950">All Categories</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Edit any row directly. Parent reassignment is limited to top-level categories and cycle-safe.
                  </p>
                </div>

                <div className="space-y-4">
                  {topLevelCategories.map((parent) => (
                    <div key={parent.id} className="space-y-4">
                      <CategoryEditorRow category={parent} />
                      {(childrenByParentId[parent.id] || []).map((child) => (
                        <div key={child.id} className="pl-4 md:pl-8">
                          <CategoryEditorRow category={child} />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </FormCard>
          </>
        )}
      </div>
    </div>
  );
}
