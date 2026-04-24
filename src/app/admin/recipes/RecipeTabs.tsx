'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ListChecks, Pencil } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CrudActionButton, CrudActionLink } from '@/components/shared/CrudAction';
import { AdminChip } from '@/components/admin/AdminChip';
import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminFilterBar } from '@/components/admin/AdminFilterBar';
import { AdminViewTabs } from '@/components/admin/AdminViewTabs';

const RECIPE_TABS = ['draft', 'pending', 'approved', 'archived'] as const;
const RECIPE_PAGE_SIZE = 10;
const RECIPE_STATUS_OPTIONS = [
  { value: 'PUBLISHED', label: 'Approved', tone: 'ok' },
  { value: 'PENDING_REVIEW', label: 'Pending', tone: 'pend' },
  { value: 'DRAFT', label: 'Draft', tone: 'neu' },
  { value: 'UNPUBLISHED', label: 'Archived', tone: 'bad' },
] as const;

type RecipeTab = (typeof RECIPE_TABS)[number];

interface RecipeRecord {
  id: string;
  title: string;
  slug: string;
  status: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'UNPUBLISHED';
  publishedAt: Date | null;
  updatedAt: Date;
  author: {
    firstName: string;
    lastName: string;
  };
  category: {
    id: string;
    name: string;
  } | null;
}

interface RecipeTabsProps {
  recipes: RecipeRecord[];
  recipeCategories: {
    id: string;
    name: string;
    slug: string;
  }[];
}

function formatDate(value: Date | null) {
  if (!value) {
    return 'Not published';
  }

  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getStatusForTab(tab: RecipeTab): RecipeRecord['status'] {
  switch (tab) {
    case 'draft':
      return 'DRAFT';
    case 'pending':
      return 'PENDING_REVIEW';
    case 'archived':
      return 'UNPUBLISHED';
    default:
      return 'PUBLISHED';
  }
}

function getTabLabel(tab: RecipeTab) {
  return tab.charAt(0).toUpperCase() + tab.slice(1);
}

function getStatusMeta(status: RecipeRecord['status']) {
  return RECIPE_STATUS_OPTIONS.find((option) => option.value === status) ?? RECIPE_STATUS_OPTIONS[0];
}

export default function RecipeTabs({ recipes, recipeCategories }: RecipeTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get('view') as RecipeTab) || 'draft';
  const focusedRecipeId = searchParams.get('focus');
  const [filterValue, setFilterValue] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rows, setRows] = useState(recipes);
  const [savingCategoryRecipeId, setSavingCategoryRecipeId] = useState<string | null>(null);
  const [savingStatusRecipeId, setSavingStatusRecipeId] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState('');
  const [statusError, setStatusError] = useState('');

  const normalizedFilter = filterValue.trim().toLowerCase();
  const currentStatus = getStatusForTab(activeTab);
  const filteredRecipes = rows.filter((recipe) => {
    if (recipe.status !== currentStatus) {
      return false;
    }

    if (!normalizedFilter) {
      return true;
    }

    return (
      recipe.title.toLowerCase().includes(normalizedFilter) ||
      recipe.author.lastName.toLowerCase().includes(normalizedFilter)
    );
  });
  const pageCount = Math.max(1, Math.ceil(filteredRecipes.length / RECIPE_PAGE_SIZE));
  const safePage = Math.min(currentPage, pageCount);
  const pageStart = (safePage - 1) * RECIPE_PAGE_SIZE;
  const pageRecipes = filteredRecipes.slice(pageStart, pageStart + RECIPE_PAGE_SIZE);
  const focusedRecipe = rows.find((recipe) => recipe.id === focusedRecipeId) ?? null;

  function handleFilterChange(value: string) {
    setFilterValue(value);
    setCurrentPage(1);
  }

  async function handleCategoryChange(recipeId: string, categoryId: string) {
    setSavingCategoryRecipeId(recipeId);
    setCategoryError('');

    try {
      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ categoryId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update category');
      }

      setRows((current) =>
        current.map((recipe) =>
          recipe.id === recipeId
            ? {
                ...recipe,
                category: data.category
                  ? {
                      id: data.category.id,
                      name: data.category.name,
                    }
                  : null,
              }
            : recipe
        )
      );
    } catch (error) {
      setCategoryError(error instanceof Error ? error.message : 'Failed to update category');
    } finally {
      setSavingCategoryRecipeId(null);
    }
  }

  async function handleStatusChange(recipeId: string, nextStatus: RecipeRecord['status']) {
    setSavingStatusRecipeId(recipeId);
    setStatusError('');

    try {
      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update status');
      }

      setRows((current) =>
        current.map((recipe) =>
          recipe.id === recipeId
            ? {
                ...recipe,
                status: data.status,
                publishedAt: data.publishedAt ? new Date(data.publishedAt) : recipe.publishedAt,
              }
            : recipe
        )
      );
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : 'Failed to update status');
    } finally {
      setSavingStatusRecipeId(null);
    }
  }

  return (
    <div className="space-y-4">
      <AdminViewTabs
        defaultView="draft"
        views={RECIPE_TABS.map((tab) => ({
          key: tab,
          label: getTabLabel(tab),
          count: rows.filter((recipe) => recipe.status === getStatusForTab(tab)).length,
          tone: tab === 'pending' ? 'pend' : tab === 'archived' ? 'bad' : undefined,
        }))}
      />

      <div className="admin-list">
        <AdminFilterBar
          search={
            <label className="admin-list-filter">
              <span className="admin-list-filter-label">Title or Author</span>
              <input
                type="text"
                value={filterValue}
                onChange={(event) => handleFilterChange(event.target.value)}
                placeholder="Search by title or author last name"
                className="admin-list-filter-input"
              />
            </label>
          }
          right={
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              {filteredRecipes.length} {getTabLabel(activeTab).toLowerCase()} recipe{filteredRecipes.length === 1 ? '' : 's'}
            </div>
          }
        />

        {categoryError ? <div className="admin-list-error">{categoryError}</div> : null}
        {statusError ? <div className="admin-list-error">{statusError}</div> : null}

        <div className="admin-list-table-wrap">
          <table className="admin-list-table">
            <thead className="admin-list-head">
              <tr>
                <th className="admin-list-header-cell">Title</th>
                <th className="admin-list-header-cell">Author</th>
                <th className="admin-list-header-cell">Category</th>
                <th className="admin-list-header-cell">Status</th>
                <th className="admin-list-header-cell">Published</th>
                <th className="admin-list-header-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRecipes.length > 0 ? (
                pageRecipes.map((recipe) => {
                  const statusMeta = getStatusMeta(recipe.status);

                  return (
                    <tr key={recipe.id} className="admin-list-row">
                      <td className="admin-list-cell">
                        <Link href={`/admin/recipes/${recipe.id}`} className="admin-list-link">
                          {recipe.title}
                        </Link>
                      </td>
                      <td className="admin-list-cell">
                        {recipe.author.firstName} {recipe.author.lastName}
                      </td>
                      <td className="admin-list-cell">
                        {recipe.category?.name || 'Uncategorized'}
                      </td>
                      <td className="admin-list-cell">
                        <AdminChip tone={statusMeta.tone}>{statusMeta.label}</AdminChip>
                      </td>
                      <td className="admin-list-cell">{formatDate(recipe.publishedAt)}</td>
                      <td className="admin-list-cell">
                        <div className="flex flex-wrap gap-3">
                          <CrudActionLink
                            href={`/recipes/submit?edit=${recipe.id}`}
                            variant="inline-link"
                            icon={Pencil}
                            label="Edit recipe"
                          >
                            Edit
                          </CrudActionLink>
                          <CrudActionButton
                            type="button"
                            variant="inline"
                            icon={ListChecks}
                            label="Manage recipe"
                            onClick={() => {
                              const next = new URLSearchParams(searchParams.toString());
                              next.set('focus', recipe.id);
                              router.replace(`?${next.toString()}`);
                            }}
                          >
                            Manage
                          </CrudActionButton>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="admin-list-empty" colSpan={6}>
                    No {activeTab} recipes match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="admin-list-pagination">
          <div className="admin-list-pagination-label">
            {filteredRecipes.length} {getTabLabel(activeTab).toLowerCase()} recipe
            {filteredRecipes.length === 1 ? '' : 's'}
          </div>
          <div className="admin-list-pagination-actions">
            <button
              type="button"
              onClick={() => setCurrentPage((current) => Math.max(1, current - 1))}
              disabled={safePage === 1}
              className="admin-list-pagination-button"
            >
              Previous
            </button>
            <span className="admin-list-pagination-page">
              Page {safePage} of {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((current) => Math.min(pageCount, current + 1))}
              disabled={safePage === pageCount}
              className="admin-list-pagination-button"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <AdminDrawer title={focusedRecipe ? `Manage ${focusedRecipe.title}` : 'Manage Recipe'}>
        {focusedRecipe ? (
          <div className="space-y-5">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <AdminChip tone={getStatusMeta(focusedRecipe.status).tone}>
                  {getStatusMeta(focusedRecipe.status).label}
                </AdminChip>
                <AdminChip tone="role">{focusedRecipe.category?.name || 'Uncategorized'}</AdminChip>
              </div>
              <div className="mt-3 space-y-1 text-sm text-slate-600">
                <p>
                  {focusedRecipe.author.firstName} {focusedRecipe.author.lastName}
                </p>
                <p>Published: {formatDate(focusedRecipe.publishedAt)}</p>
                <p>Last updated: {formatDate(focusedRecipe.updatedAt)}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Category</p>
              <select
                className="admin-list-cell-select min-w-[14rem]"
                defaultValue={focusedRecipe.category?.id || ''}
                disabled={savingCategoryRecipeId === focusedRecipe.id}
                onChange={(event) => handleCategoryChange(focusedRecipe.id, event.target.value)}
              >
                <option value="" disabled>
                  Select category
                </option>
                {recipeCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Status</p>
              <select
                className="admin-list-cell-select min-w-[14rem]"
                defaultValue={focusedRecipe.status}
                disabled={savingStatusRecipeId === focusedRecipe.id}
                onChange={(event) =>
                  handleStatusChange(focusedRecipe.id, event.target.value as RecipeRecord['status'])
                }
              >
                {RECIPE_STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            <CrudActionLink
              href={`/recipes/submit?edit=${focusedRecipe.id}`}
              variant="inline-link"
              icon={Pencil}
              label="Edit recipe"
            >
              Open editor
            </CrudActionLink>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
            The selected recipe is not available in the current result set.
          </div>
        )}
      </AdminDrawer>
    </div>
  );
}
