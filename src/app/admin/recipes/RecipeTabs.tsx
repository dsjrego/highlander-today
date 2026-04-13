'use client';

import Link from 'next/link';
import { useState } from 'react';
import { FolderPen, ListChecks } from 'lucide-react';
import { CrudActionButton } from '@/components/shared/CrudAction';

const RECIPE_TABS = ['draft', 'pending', 'approved', 'archived'] as const;
const RECIPE_PAGE_SIZE = 10;
const RECIPE_STATUS_OPTIONS = [
  { value: 'PUBLISHED', label: 'Approved' },
  { value: 'PENDING_REVIEW', label: 'Pending' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'UNPUBLISHED', label: 'Archived' },
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

export default function RecipeTabs({ recipes, recipeCategories }: RecipeTabsProps) {
  const [activeTab, setActiveTab] = useState<RecipeTab>('draft');
  const [filterValue, setFilterValue] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rows, setRows] = useState(recipes);
  const [editingCategoryRecipeId, setEditingCategoryRecipeId] = useState<string | null>(null);
  const [savingCategoryRecipeId, setSavingCategoryRecipeId] = useState<string | null>(null);
  const [editingStatusRecipeId, setEditingStatusRecipeId] = useState<string | null>(null);
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
      setEditingCategoryRecipeId(null);
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
      setEditingStatusRecipeId(null);
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : 'Failed to update status');
    } finally {
      setSavingStatusRecipeId(null);
    }
  }

  return (
    <div className="space-y-0">
      <div className="relative top-[2px] flex flex-wrap gap-0 pb-0">
        {RECIPE_TABS.map((tab) => {
          const isActive = tab === activeTab;

          return (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setActiveTab(tab);
                setCurrentPage(1);
              }}
              className={`admin-card-tab ${isActive ? 'admin-card-tab-active' : 'admin-card-tab-inactive'}`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      <div className="admin-card-tab-body">
        <div className="admin-list">
          <div className="admin-list-toolbar">
            <label className="admin-list-filter">
              <span className="admin-list-filter-label">Filter: Title, Author</span>
              <input
                type="text"
                value={filterValue}
                onChange={(event) => handleFilterChange(event.target.value)}
                placeholder="Search by title or author last name"
                className="admin-list-filter-input"
              />
            </label>
          </div>

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
                </tr>
              </thead>
              <tbody>
                {pageRecipes.length > 0 ? (
                  pageRecipes.map((recipe) => (
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
                        {editingCategoryRecipeId === recipe.id ? (
                          <select
                            className="admin-list-cell-select"
                            defaultValue={recipe.category?.id || ''}
                            disabled={savingCategoryRecipeId === recipe.id}
                            onBlur={() => {
                              if (savingCategoryRecipeId !== recipe.id) {
                                setEditingCategoryRecipeId(null);
                              }
                            }}
                            onChange={(event) => handleCategoryChange(recipe.id, event.target.value)}
                            autoFocus
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
                        ) : (
                          <CrudActionButton
                            type="button"
                            variant="inline"
                            icon={FolderPen}
                            label={recipe.category?.name || 'Uncategorized'}
                            onClick={() => setEditingCategoryRecipeId(recipe.id)}
                          >
                            {recipe.category?.name || 'Uncategorized'}
                          </CrudActionButton>
                        )}
                      </td>
                      <td className="admin-list-cell">
                        {editingStatusRecipeId === recipe.id ? (
                          <select
                            className="admin-list-cell-select"
                            defaultValue={recipe.status}
                            disabled={savingStatusRecipeId === recipe.id}
                            onBlur={() => {
                              if (savingStatusRecipeId !== recipe.id) {
                                setEditingStatusRecipeId(null);
                              }
                            }}
                            onChange={(event) =>
                              handleStatusChange(recipe.id, event.target.value as RecipeRecord['status'])
                            }
                            autoFocus
                          >
                            {RECIPE_STATUS_OPTIONS.map((status) => (
                              <option key={status.value} value={status.value}>
                                {status.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <CrudActionButton
                            type="button"
                            variant="inline"
                            icon={ListChecks}
                            label={
                              RECIPE_STATUS_OPTIONS.find((status) => status.value === recipe.status)?.label || 'Status'
                            }
                            onClick={() => setEditingStatusRecipeId(recipe.id)}
                          >
                            {RECIPE_STATUS_OPTIONS.find((status) => status.value === recipe.status)?.label}
                          </CrudActionButton>
                        )}
                      </td>
                      <td className="admin-list-cell">{formatDate(recipe.publishedAt)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="admin-list-empty" colSpan={5}>
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
      </div>
    </div>
  );
}
