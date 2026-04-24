'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowDown, ArrowUp, BookOpenText, Plus, Save, Trash2 } from 'lucide-react';
import { AdminPage } from '@/components/admin/AdminPage';
import { AdminViewTabs } from '@/components/admin/AdminViewTabs';
import { CrudActionButton } from '@/components/shared/CrudAction';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import FormCard, { FormCardActions } from '@/components/shared/FormCard';
import {
  CATEGORY_CONTENT_MODELS,
  CATEGORY_CONTENT_MODEL_LABELS,
  CategoryContentModel,
} from '@/lib/admin-content-reference';

const CATEGORY_TRUST_LEVELS = ['ANONYMOUS', 'REGISTERED', 'TRUSTED', 'SUSPENDED'] as const;
type CategoryTrustLevel = (typeof CATEGORY_TRUST_LEVELS)[number];

const CATEGORY_TRUST_LEVEL_LABELS: Record<CategoryTrustLevel, string> = {
  ANONYMOUS: 'Public',
  REGISTERED: 'Registered',
  TRUSTED: 'Trusted+',
  SUSPENDED: 'Suspended only',
};

type CategoryRecord = {
  id: string;
  name: string;
  slug: string;
  contentModel: CategoryContentModel | null;
  minTrustLevel: CategoryTrustLevel;
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
    recipes: number;
    childCategories: number;
  };
};

type EditableCategory = Record<
  string,
  {
    name: string;
    slug: string;
    contentModel: CategoryContentModel | null;
    minTrustLevel: CategoryTrustLevel;
    sortOrder: number;
    isArchived: boolean;
    parentCategoryId: string | null;
  }
>;

type CategoryEditorRowProps = {
  category: CategoryRecord;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  draft: EditableCategory[string];
  topLevelCategories: CategoryRecord[];
  categories: CategoryRecord[];
  descendantsById: Map<string, Set<string>>;
  isReordering: string | null;
  isSaving: string | null;
  isDeleting: string | null;
  updateDraft: (categoryId: string, changes: Partial<EditableCategory[string]>) => void;
  toggleExpanded: (categoryId: string) => void;
  moveCategory: (categoryId: string, direction: 'up' | 'down') => void;
  handleSaveCategory: (categoryId: string) => void;
  requestDeleteCategory: (category: CategoryRecord) => void;
};

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

function CategoryEditorRow({
  category,
  depth,
  hasChildren,
  isExpanded,
  draft,
  topLevelCategories,
  categories,
  descendantsById,
  isReordering,
  isSaving,
  isDeleting,
  updateDraft,
  toggleExpanded,
  moveCategory,
  handleSaveCategory,
  requestDeleteCategory,
}: CategoryEditorRowProps) {
  const siblingCategories = sortCategories(
    categories.filter((candidate) => candidate.parentCategoryId === draft.parentCategoryId)
  );
  const siblingIndex = siblingCategories.findIndex((candidate) => candidate.id === category.id);
  const disallowedParentIds = descendantsById.get(category.id) ?? new Set<string>();

  return (
    <tr className="admin-list-row">
      <td className="admin-list-cell">
        <div className="flex min-w-[14rem] items-center gap-2" style={{ paddingLeft: `${depth * 1.25}rem` }}>
          {depth > 0 ? (
            <span className="admin-category-branch-marker" aria-hidden="true">
              ↳
            </span>
          ) : null}
          {hasChildren ? (
            <button
              type="button"
              onClick={() => toggleExpanded(category.id)}
              className="admin-list-cell-button w-4 text-slate-500"
              aria-label={isExpanded ? `Collapse ${draft.name}` : `Expand ${draft.name}`}
              aria-expanded={isExpanded}
            >
              {isExpanded ? '▾' : '▸'}
            </button>
          ) : (
            <span className="inline-block w-4 text-slate-300" aria-hidden="true" />
          )}
          <input
            type="text"
            value={draft.name}
            onChange={(event) => {
              const name = event.target.value;
              updateDraft(category.id, { name, slug: slugify(name) });
            }}
            className="admin-list-cell-input"
          />
        </div>
      </td>
      <td className="admin-list-cell">
        <input
          type="text"
          value={draft.slug}
          onChange={(event) => updateDraft(category.id, { slug: slugify(event.target.value) })}
          className="admin-list-cell-input min-w-[10rem]"
        />
      </td>
      <td className="admin-list-cell">
        <select
          value={draft.parentCategoryId ?? ''}
          onChange={(event) =>
            updateDraft(category.id, {
              parentCategoryId: event.target.value || null,
            })
          }
          className="admin-list-cell-select min-w-[11rem]"
        >
          <option value="">Top-level menu</option>
          {topLevelCategories
            .filter((candidate) => candidate.id !== category.id && !disallowedParentIds.has(candidate.id))
            .map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name}
              </option>
            ))}
        </select>
      </td>
      <td className="admin-list-cell">
        <select
          value={draft.contentModel ?? ''}
          onChange={(event) =>
            updateDraft(category.id, {
              contentModel: (event.target.value || null) as CategoryContentModel | null,
            })
          }
          className="admin-list-cell-select"
        >
          <option value="">No explicit model</option>
          {CATEGORY_CONTENT_MODELS.map((contentModel) => (
            <option key={contentModel} value={contentModel}>
              {CATEGORY_CONTENT_MODEL_LABELS[contentModel]}
            </option>
          ))}
        </select>
      </td>
      <td className="admin-list-cell">
        <select
          value={draft.minTrustLevel}
          onChange={(event) =>
            updateDraft(category.id, {
              minTrustLevel: event.target.value as CategoryTrustLevel,
            })
          }
          className="admin-list-cell-select min-w-[10rem]"
        >
          {CATEGORY_TRUST_LEVELS.map((trustLevel) => (
            <option key={trustLevel} value={trustLevel}>
              {CATEGORY_TRUST_LEVEL_LABELS[trustLevel]}
            </option>
          ))}
        </select>
      </td>
      <td className="admin-list-cell">{draft.sortOrder}</td>
      <td className="admin-list-cell">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={!draft.isArchived}
            onChange={(event) => updateDraft(category.id, { isArchived: !event.target.checked })}
            className="h-4 w-4 rounded border-slate-300"
          />
          Active
        </label>
      </td>
      <td className="admin-list-cell">
        <div className="flex items-center gap-2">
          <CrudActionButton
            type="button"
            variant="inline"
            icon={ArrowUp}
            label="Move up"
            onClick={() => moveCategory(category.id, 'up')}
            disabled={siblingIndex <= 0 || isReordering === category.id}
          >
            Up
          </CrudActionButton>
          <CrudActionButton
            type="button"
            variant="inline"
            icon={ArrowDown}
            label="Move down"
            onClick={() => moveCategory(category.id, 'down')}
            disabled={siblingIndex === -1 || siblingIndex >= siblingCategories.length - 1 || isReordering === category.id}
          >
            Down
          </CrudActionButton>
          <CrudActionButton
            type="button"
            variant="inline"
            icon={Save}
            label={isSaving === category.id ? 'Saving category' : 'Save category'}
            onClick={() => handleSaveCategory(category.id)}
            disabled={isSaving === category.id}
          >
            {isSaving === category.id ? 'Saving...' : 'Save'}
          </CrudActionButton>
          <CrudActionButton
            type="button"
            variant="inline-danger"
            icon={Trash2}
            label={isDeleting === category.id ? 'Deleting category' : 'Delete category'}
            onClick={() => requestDeleteCategory(category)}
            disabled={isDeleting === category.id}
          >
            {isDeleting === category.id ? 'Deleting...' : 'Delete'}
          </CrudActionButton>
        </div>
      </td>
    </tr>
  );
}

export default function CategoryManagerPage() {
  const searchParams = useSearchParams();
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [editable, setEditable] = useState<EditableCategory>({});
  const [newCategory, setNewCategory] = useState({
    name: '',
    slug: '',
    contentModel: '' as '' | CategoryContentModel,
    minTrustLevel: 'ANONYMOUS' as CategoryTrustLevel,
    parentCategoryId: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [deleteDialogCategory, setDeleteDialogCategory] = useState<CategoryRecord | null>(null);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const activeView = searchParams.get('view') ?? 'navigation';

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (includeArchived) {
        params.set('includeArchived', 'true');
      }

      const res = await fetch(`/api/admin/categories${params.size ? `?${params.toString()}` : ''}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to load categories');
        return;
      }

      const nextCategories = sortCategories((data.categories || []) as CategoryRecord[]);
      setCategories(nextCategories);
      setExpandedCategoryIds((current) =>
        Object.fromEntries(
          nextCategories.map((category: CategoryRecord) => {
            const hasChildren = nextCategories.some(
              (candidate: CategoryRecord) => candidate.parentCategoryId === category.id
            );

            return [category.id, current[category.id] ?? hasChildren];
          })
        )
      );
      setEditable(
        Object.fromEntries(
          nextCategories.map((category: CategoryRecord) => [
            category.id,
            {
              name: category.name,
              slug: category.slug,
              contentModel: category.contentModel,
              minTrustLevel: category.minTrustLevel,
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
  }, [includeArchived]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const topLevelCategories = useMemo(
    () => sortCategories(categories.filter((category) => category.parentCategoryId === null)),
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

  function toggleExpanded(categoryId: string) {
    setExpandedCategoryIds((current) => ({
      ...current,
      [categoryId]: !current[categoryId],
    }));
  }

  const orderedCategories = useMemo(() => {
    const ordered: Array<{ category: CategoryRecord; depth: number }> = [];

    function walk(category: CategoryRecord, depth: number) {
      ordered.push({ category, depth });
      if (expandedCategoryIds[category.id] === false) {
        return;
      }
      for (const child of childrenByParentId[category.id] || []) {
        walk(child, depth + 1);
      }
    }

    for (const category of topLevelCategories) {
      walk(category, 0);
    }

    return ordered;
  }, [childrenByParentId, expandedCategoryIds, topLevelCategories]);

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
          contentModel: newCategory.contentModel || null,
          minTrustLevel: newCategory.minTrustLevel,
          parentCategoryId: newCategory.parentCategoryId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create menu item');
        return;
      }

      setSuccess('Menu item created');
      setNewCategory({
        name: '',
        slug: '',
        contentModel: '',
        minTrustLevel: 'ANONYMOUS',
        parentCategoryId: '',
      });
      await loadCategories();
    } catch {
      setError('Failed to create menu item');
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

    const reorderedSiblings = [...siblings];
    const [movedCategory] = reorderedSiblings.splice(currentIndex, 1);
    reorderedSiblings.splice(targetIndex, 0, movedCategory);

    const originalSortOrders = Object.fromEntries(
      siblings.map((category) => [category.id, editable[category.id]?.sortOrder ?? category.sortOrder])
    );
    const updates = reorderedSiblings.map((category, index) => ({
      id: category.id,
      sortOrder: index,
    }));

    for (const update of updates) {
      updateDraft(update.id, { sortOrder: update.sortOrder });
    }

    setIsReordering(categoryId);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/admin/categories/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        for (const sibling of siblings) {
          updateDraft(sibling.id, { sortOrder: originalSortOrders[sibling.id] });
        }
        setError(data.error || 'Failed to reorder menu item');
        return;
      }

      setSuccess('Menu item order updated');
      await loadCategories();
    } catch {
      for (const sibling of siblings) {
        updateDraft(sibling.id, { sortOrder: originalSortOrders[sibling.id] });
      }
      setError('Failed to reorder menu item');
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
          contentModel: draft.contentModel,
          minTrustLevel: draft.minTrustLevel,
          sortOrder: draft.sortOrder,
          isArchived: draft.isArchived,
          parentCategoryId: draft.parentCategoryId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to update menu item');
        return;
      }

      setSuccess('Menu item updated');
      await loadCategories();
    } catch {
      setError('Failed to update menu item');
    } finally {
      setIsSaving(null);
    }
  }

  async function handleDeleteCategory(category: CategoryRecord) {
    setIsDeleting(category.id);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/admin/categories/${category.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to delete menu item');
        return;
      }

      setSuccess(`Deleted menu item "${category.name}"`);
      setDeleteDialogCategory(null);
      await loadCategories();
    } catch {
      setError('Failed to delete menu item');
    } finally {
      setIsDeleting(null);
    }
  }

  return (
    <AdminPage
      title="Navigation"
      count={categories.length}
      actions={
        <Link href="/admin/content-architecture" className="admin-facet">
          Content Architecture
        </Link>
      }
    >
      <div className="admin-section-card">
        <div className="admin-section-card-head">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--hl-admin-border)] bg-[var(--hl-admin-surface-muted)] text-[var(--hl-admin-link)]">
              <BookOpenText className="h-4 w-4" />
            </div>
            <div>
              <h2 className="admin-section-card-title">Site Navigation</h2>
              <p className="mt-1 text-sm text-slate-500">
                Manage the top-level navbar structure, submenu nesting, model assignments, and trust gating.
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          {error || success ? (
            <div className="space-y-4">
              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>
              ) : null}
              {success ? (
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-700">{success}</div>
              ) : null}
            </div>
          ) : null}

          <AdminViewTabs
            defaultView="navigation"
            views={[
              { key: 'navigation', label: 'Navigation', count: categories.length },
              { key: 'create', label: 'Add Area' },
            ]}
          />

          <div className="admin-section-card rounded-[1.25rem] border border-[var(--hl-admin-border)] bg-[var(--hl-admin-surface-muted)] p-4 shadow-none">
            {activeView === 'navigation' ? (
                <FormCard>
                  <div className="space-y-5">
                    <div className="flex flex-col gap-3 border-b border-slate-200/80 pb-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Navigation Tree</p>
                        <p className="mt-1 text-sm text-slate-500">
                          Reorder items within a level, change parent relationships, and archive areas without deleting the whole tree.
                        </p>
                      </div>
                      <label className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={includeArchived}
                          onChange={(event) => setIncludeArchived(event.target.checked)}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        Include archived menu items
                      </label>
                    </div>

                    {isLoading ? (
                      <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center text-slate-500">
                        Loading categories...
                      </div>
                    ) : (
                      <div className="admin-list">
                        <div className="admin-list-table-wrap">
                          <table className="admin-list-table">
                            <thead className="admin-list-head">
                              <tr>
                                <th className="admin-list-header-cell">Name</th>
                                <th className="admin-list-header-cell">Slug</th>
                                <th className="admin-list-header-cell">Parent</th>
                                <th className="admin-list-header-cell">Model</th>
                                <th className="admin-list-header-cell">Min Trust</th>
                                <th className="admin-list-header-cell">Order</th>
                                <th className="admin-list-header-cell">Status</th>
                                <th className="admin-list-header-cell">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {orderedCategories.length > 0 ? (
                                orderedCategories.map(({ category, depth }) =>
                                  editable[category.id] ? (
                                    <CategoryEditorRow
                                      key={category.id}
                                      category={category}
                                      depth={depth}
                                      hasChildren={(childrenByParentId[category.id] || []).length > 0}
                                      isExpanded={expandedCategoryIds[category.id] !== false}
                                      draft={editable[category.id]}
                                      topLevelCategories={topLevelCategories}
                                      categories={categories}
                                      descendantsById={descendantsById}
                                      isReordering={isReordering}
                                      isSaving={isSaving}
                                      isDeleting={isDeleting}
                                      updateDraft={updateDraft}
                                      toggleExpanded={toggleExpanded}
                                      moveCategory={moveCategory}
                                      handleSaveCategory={handleSaveCategory}
                                      requestDeleteCategory={setDeleteDialogCategory}
                                    />
                                  ) : null
                                )
                              ) : (
                                <tr className="admin-list-row">
                                  <td className="admin-list-empty" colSpan={8}>
                                    No categories found.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </FormCard>
            ) : (
                <FormCard>
                  <form onSubmit={handleCreateCategory} className="space-y-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-950">Add Menu Item</h2>
                    </div>

                    <div className="grid gap-4 md:grid-cols-5">
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
                          placeholder="Menu item name"
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
                          placeholder="menu-item-slug"
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
                          <option value="">Top-level menu</option>
                          {topLevelCategories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Model type</label>
                        <select
                          value={newCategory.contentModel}
                          onChange={(event) =>
                            setNewCategory((current) => ({
                              ...current,
                              contentModel: event.target.value as '' | CategoryContentModel,
                            }))
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950"
                        >
                          <option value="">Select model type</option>
                          {CATEGORY_CONTENT_MODELS.map((contentModel) => (
                            <option key={contentModel} value={contentModel}>
                              {CATEGORY_CONTENT_MODEL_LABELS[contentModel]}
                            </option>
                          ))}
                        </select>
                        <p className="mt-2 text-xs leading-5 text-slate-500">
                          Required for subcategories. Top-level sections can stay unset.
                        </p>
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Min trust</label>
                        <select
                          value={newCategory.minTrustLevel}
                          onChange={(event) =>
                            setNewCategory((current) => ({
                              ...current,
                              minTrustLevel: event.target.value as CategoryTrustLevel,
                            }))
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950"
                        >
                          {CATEGORY_TRUST_LEVELS.map((trustLevel) => (
                            <option key={trustLevel} value={trustLevel}>
                              {CATEGORY_TRUST_LEVEL_LABELS[trustLevel]}
                            </option>
                          ))}
                        </select>
                        <p className="mt-2 text-xs leading-5 text-slate-500">
                          Default is public. Raise this for trusted-only sections like Help Us Grow.
                        </p>
                      </div>
                    </div>

                    <FormCardActions>
                      <CrudActionButton
                        type="submit"
                        variant="primary"
                        icon={Plus}
                        label={isCreating ? 'Creating menu item' : 'Add Menu Item'}
                        disabled={isCreating}
                      >
                        {isCreating ? 'Creating...' : 'Add Menu Item'}
                      </CrudActionButton>
                    </FormCardActions>
                  </form>
                </FormCard>
            )}
          </div>
        </div>
      </div>

      {deleteDialogCategory ? (
        <ConfirmDialog
          title="Delete menu item"
          description={`Delete menu item "${deleteDialogCategory.name}" (${deleteDialogCategory.slug})? Child menu items will be removed with it, and article references will be cleared.`}
          confirmLabel="Delete menu item"
          isSubmitting={isDeleting === deleteDialogCategory.id}
          onCancel={() => {
            if (isDeleting !== deleteDialogCategory.id) {
              setDeleteDialogCategory(null);
            }
          }}
          onConfirm={() => handleDeleteCategory(deleteDialogCategory)}
        />
      ) : null}
    </AdminPage>
  );
}
