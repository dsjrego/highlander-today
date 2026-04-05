'use client';

import Link from 'next/link';
import { useState } from 'react';
import { FolderPen, ListChecks } from 'lucide-react';
import { CrudActionButton } from '@/components/shared/CrudAction';

const ARTICLE_TABS = ['draft', 'pending', 'approved', 'archived'] as const;
const ARTICLE_PAGE_SIZE = 10;
const ARTICLE_STATUS_OPTIONS = [
  { value: 'PUBLISHED', label: 'Approved' },
  { value: 'PENDING_REVIEW', label: 'Pending' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'UNPUBLISHED', label: 'Archived' },
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

export default function ArticleTabs({ articles, articleCategories }: ArticleTabsProps) {
  const [activeTab, setActiveTab] = useState<ArticleTab>('draft');
  const [filterValue, setFilterValue] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rows, setRows] = useState(articles);
  const [editingCategoryArticleId, setEditingCategoryArticleId] = useState<string | null>(null);
  const [savingCategoryArticleId, setSavingCategoryArticleId] = useState<string | null>(null);
  const [editingStatusArticleId, setEditingStatusArticleId] = useState<string | null>(null);
  const [savingStatusArticleId, setSavingStatusArticleId] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState('');
  const [statusError, setStatusError] = useState('');

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
  const pageArticles = filteredArticles.slice(
    pageStart,
    pageStart + ARTICLE_PAGE_SIZE
  );

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
      setEditingCategoryArticleId(null);
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
      setEditingStatusArticleId(null);
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : 'Failed to update status');
    } finally {
      setSavingStatusArticleId(null);
    }
  }

  return (
    <div className="space-y-0">
      <div className="relative top-[2px] flex flex-wrap gap-0 pb-0">
        {ARTICLE_TABS.map((tab) => {
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
                {pageArticles.length > 0 ? (
                  pageArticles.map((article) => (
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
                        {editingCategoryArticleId === article.id ? (
                          <select
                            className="admin-list-cell-select"
                            defaultValue={article.category?.id || ''}
                            disabled={savingCategoryArticleId === article.id}
                            onBlur={() => {
                              if (savingCategoryArticleId !== article.id) {
                                setEditingCategoryArticleId(null);
                              }
                            }}
                            onChange={(event) => handleCategoryChange(article.id, event.target.value)}
                            autoFocus
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
                        ) : (
                          <CrudActionButton
                            type="button"
                            variant="inline"
                            icon={FolderPen}
                            label={article.category?.name || 'Uncategorized'}
                            onClick={() => setEditingCategoryArticleId(article.id)}
                          >
                            {article.category?.name || 'Uncategorized'}
                          </CrudActionButton>
                        )}
                      </td>
                      <td className="admin-list-cell">
                        {editingStatusArticleId === article.id ? (
                          <select
                            className="admin-list-cell-select"
                            defaultValue={article.status}
                            disabled={savingStatusArticleId === article.id}
                            onBlur={() => {
                              if (savingStatusArticleId !== article.id) {
                                setEditingStatusArticleId(null);
                              }
                            }}
                            onChange={(event) =>
                              handleStatusChange(article.id, event.target.value as ArticleRecord['status'])
                            }
                            autoFocus
                          >
                            {ARTICLE_STATUS_OPTIONS.map((status) => (
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
                              ARTICLE_STATUS_OPTIONS.find((status) => status.value === article.status)?.label || 'Status'
                            }
                            onClick={() => setEditingStatusArticleId(article.id)}
                          >
                            {ARTICLE_STATUS_OPTIONS.find((status) => status.value === article.status)?.label}
                          </CrudActionButton>
                        )}
                      </td>
                      <td className="admin-list-cell">{formatDate(article.publishedAt)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="admin-list-empty" colSpan={5}>
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
      </div>
    </div>
  );
}
