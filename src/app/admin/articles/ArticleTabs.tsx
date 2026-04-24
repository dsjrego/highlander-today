'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ListChecks, Pencil, Trash2 } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CrudActionButton, CrudActionLink } from '@/components/shared/CrudAction';
import { AdminChip } from '@/components/admin/AdminChip';
import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminFilterBar } from '@/components/admin/AdminFilterBar';
import { AdminViewTabs } from '@/components/admin/AdminViewTabs';

const ARTICLE_TABS = ['draft', 'pending', 'approved', 'archived'] as const;
const ARTICLE_PAGE_SIZE = 10;
const ARTICLE_STATUS_OPTIONS = [
  { value: 'PUBLISHED', label: 'Approved', tone: 'ok' },
  { value: 'PENDING_REVIEW', label: 'Pending', tone: 'pend' },
  { value: 'DRAFT', label: 'Draft', tone: 'neu' },
  { value: 'UNPUBLISHED', label: 'Archived', tone: 'bad' },
] as const;

type ArticleTab = (typeof ARTICLE_TABS)[number];

interface ArticleRecord {
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

interface ArticleTabsProps {
  articles: ArticleRecord[];
  articleCategories: {
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

function getStatusForTab(tab: ArticleTab): ArticleRecord['status'] {
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

function getTabLabel(tab: ArticleTab) {
  return tab.charAt(0).toUpperCase() + tab.slice(1);
}

function getStatusMeta(status: ArticleRecord['status']) {
  return ARTICLE_STATUS_OPTIONS.find((option) => option.value === status) ?? ARTICLE_STATUS_OPTIONS[0];
}

export default function ArticleTabs({ articles, articleCategories }: ArticleTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get('view') as ArticleTab) || 'draft';
  const focusedArticleId = searchParams.get('focus');
  const [filterValue, setFilterValue] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rows, setRows] = useState(articles);
  const [savingCategoryArticleId, setSavingCategoryArticleId] = useState<string | null>(null);
  const [savingStatusArticleId, setSavingStatusArticleId] = useState<string | null>(null);
  const [deletingArticleId, setDeletingArticleId] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState('');
  const [statusError, setStatusError] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const normalizedFilter = filterValue.trim().toLowerCase();
  const currentStatus = getStatusForTab(activeTab);
  const filteredArticles = rows.filter((article) => {
    if (article.status !== currentStatus) {
      return false;
    }

    if (!normalizedFilter) {
      return true;
    }

    return (
      article.title.toLowerCase().includes(normalizedFilter) ||
      article.author.lastName.toLowerCase().includes(normalizedFilter)
    );
  });
  const pageCount = Math.max(1, Math.ceil(filteredArticles.length / ARTICLE_PAGE_SIZE));
  const safePage = Math.min(currentPage, pageCount);
  const pageStart = (safePage - 1) * ARTICLE_PAGE_SIZE;
  const pageArticles = filteredArticles.slice(pageStart, pageStart + ARTICLE_PAGE_SIZE);
  const focusedArticle = rows.find((article) => article.id === focusedArticleId) ?? null;

  function handleFilterChange(value: string) {
    setFilterValue(value);
    setCurrentPage(1);
  }

  async function handleCategoryChange(articleId: string, categoryId: string) {
    setSavingCategoryArticleId(articleId);
    setCategoryError('');

    try {
      const response = await fetch(`/api/articles/${articleId}`, {
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
        current.map((article) =>
          article.id === articleId
            ? {
                ...article,
                category: data.category
                  ? {
                      id: data.category.id,
                      name: data.category.name,
                    }
                  : null,
              }
            : article
        )
      );
    } catch (error) {
      setCategoryError(error instanceof Error ? error.message : 'Failed to update category');
    } finally {
      setSavingCategoryArticleId(null);
    }
  }

  async function handleStatusChange(
    articleId: string,
    nextStatus: ArticleRecord['status']
  ) {
    setSavingStatusArticleId(articleId);
    setStatusError('');

    try {
      const response = await fetch(`/api/articles/${articleId}`, {
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
        current.map((article) =>
          article.id === articleId
            ? {
                ...article,
                status: data.status,
                publishedAt: data.publishedAt ? new Date(data.publishedAt) : article.publishedAt,
              }
            : article
        )
      );
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : 'Failed to update status');
    } finally {
      setSavingStatusArticleId(null);
    }
  }

  async function handleDeleteArticle(article: ArticleRecord) {
    setDeletingArticleId(article.id);
    setDeleteError('');

    try {
      const response = await fetch(`/api/articles/${article.id}`, {
        method: 'DELETE',
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete article');
      }

      setRows((current) => current.filter((entry) => entry.id !== article.id));
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete article');
    } finally {
      setDeletingArticleId(null);
    }
  }

  return (
    <div className="space-y-4">
      <AdminViewTabs
        defaultView="draft"
        views={ARTICLE_TABS.map((tab) => ({
          key: tab,
          label: getTabLabel(tab),
          count: rows.filter((article) => article.status === getStatusForTab(tab)).length,
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
              {filteredArticles.length} {getTabLabel(activeTab).toLowerCase()} article{filteredArticles.length === 1 ? '' : 's'}
            </div>
          }
        />

        {categoryError ? <div className="admin-list-error">{categoryError}</div> : null}
        {statusError ? <div className="admin-list-error">{statusError}</div> : null}
        {deleteError ? <div className="admin-list-error">{deleteError}</div> : null}

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
              {pageArticles.length > 0 ? (
                pageArticles.map((article) => {
                  const statusMeta = getStatusMeta(article.status);

                  return (
                    <tr key={article.id} className="admin-list-row">
                      <td className="admin-list-cell">
                        <Link href={`/admin/articles/${article.id}`} className="admin-list-link">
                          {article.title}
                        </Link>
                      </td>
                      <td className="admin-list-cell">
                        {article.author.firstName} {article.author.lastName}
                      </td>
                      <td className="admin-list-cell">
                        {article.category?.name || 'Uncategorized'}
                      </td>
                      <td className="admin-list-cell">
                        <AdminChip tone={statusMeta.tone}>{statusMeta.label}</AdminChip>
                      </td>
                      <td className="admin-list-cell">{formatDate(article.publishedAt)}</td>
                      <td className="admin-list-cell">
                        <div className="flex flex-wrap gap-3">
                          <CrudActionLink
                            href={`/local-life/submit?edit=${article.id}`}
                            variant="inline-link"
                            icon={Pencil}
                            label="Edit article"
                          >
                            Edit
                          </CrudActionLink>
                          <CrudActionButton
                            type="button"
                            variant="inline"
                            icon={ListChecks}
                            label="Manage article"
                            onClick={() => {
                              const next = new URLSearchParams(searchParams.toString());
                              next.set('focus', article.id);
                              router.replace(`${pathname}?${next.toString()}`);
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
                    No {activeTab} articles match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="admin-list-pagination">
          <div className="admin-list-pagination-label">
            {filteredArticles.length} {getTabLabel(activeTab).toLowerCase()} article
            {filteredArticles.length === 1 ? '' : 's'}
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

      <AdminDrawer title={focusedArticle ? `Manage ${focusedArticle.title}` : 'Manage Article'}>
        {focusedArticle ? (
          <div className="space-y-5">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <AdminChip tone={getStatusMeta(focusedArticle.status).tone}>
                  {getStatusMeta(focusedArticle.status).label}
                </AdminChip>
                <AdminChip tone="role">{focusedArticle.category?.name || 'Uncategorized'}</AdminChip>
              </div>
              <div className="mt-3 space-y-1 text-sm text-slate-600">
                <p>
                  {focusedArticle.author.firstName} {focusedArticle.author.lastName}
                </p>
                <p>Published: {formatDate(focusedArticle.publishedAt)}</p>
                <p>Last updated: {formatDate(focusedArticle.updatedAt)}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Category</p>
              <select
                className="admin-list-cell-select min-w-[14rem]"
                defaultValue={focusedArticle.category?.id || ''}
                disabled={savingCategoryArticleId === focusedArticle.id}
                onChange={(event) => handleCategoryChange(focusedArticle.id, event.target.value)}
              >
                <option value="" disabled>
                  Select category
                </option>
                {articleCategories.map((category) => (
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
                defaultValue={focusedArticle.status}
                disabled={savingStatusArticleId === focusedArticle.id}
                onChange={(event) =>
                  handleStatusChange(focusedArticle.id, event.target.value as ArticleRecord['status'])
                }
              >
                {ARTICLE_STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-3">
              <CrudActionLink
                href={`/local-life/submit?edit=${focusedArticle.id}`}
                variant="inline-link"
                icon={Pencil}
                label="Edit article"
              >
                Open editor
              </CrudActionLink>
              <CrudActionButton
                type="button"
                variant="inline-danger"
                icon={Trash2}
                label={deletingArticleId === focusedArticle.id ? 'Deleting article' : 'Delete article'}
                onClick={() => handleDeleteArticle(focusedArticle)}
                disabled={deletingArticleId === focusedArticle.id}
              >
                {deletingArticleId === focusedArticle.id ? 'Deleting...' : 'Delete article'}
              </CrudActionButton>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
            The selected article is not available in the current result set.
          </div>
        )}
      </AdminDrawer>
    </div>
  );
}
