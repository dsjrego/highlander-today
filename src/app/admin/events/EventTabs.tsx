'use client';

import Link from 'next/link';
import { useState } from 'react';

const EVENT_TABS = ['pending', 'approved', 'archived'] as const;
const EVENT_PAGE_SIZE = 10;
const EVENT_STATUS_OPTIONS = [
  { value: 'PUBLISHED', label: 'Approved' },
  { value: 'PENDING_REVIEW', label: 'Pending' },
  { value: 'UNPUBLISHED', label: 'Archived' },
] as const;

type EventTab = (typeof EVENT_TABS)[number];

interface EventRecord {
  id: string;
  title: string;
  status: 'PENDING_REVIEW' | 'PUBLISHED' | 'UNPUBLISHED';
  startDatetime: Date;
  endDatetime: Date | null;
  updatedAt: Date;
  locationText: string | null;
  submittedBy: {
    firstName: string;
    lastName: string;
  };
}

interface EventTabsProps {
  events: EventRecord[];
}

function formatDateTime(value: Date | null) {
  if (!value) {
    return 'Not set';
  }

  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getStatusForTab(tab: EventTab): EventRecord['status'] {
  switch (tab) {
    case 'pending':
      return 'PENDING_REVIEW';
    case 'archived':
      return 'UNPUBLISHED';
    default:
      return 'PUBLISHED';
  }
}

function getTabLabel(tab: EventTab) {
  return tab.charAt(0).toUpperCase() + tab.slice(1);
}

export default function EventTabs({ events }: EventTabsProps) {
  const [activeTab, setActiveTab] = useState<EventTab>('pending');
  const [filterValue, setFilterValue] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rows, setRows] = useState(events);
  const [editingStatusEventId, setEditingStatusEventId] = useState<string | null>(null);
  const [savingStatusEventId, setSavingStatusEventId] = useState<string | null>(null);
  const [statusError, setStatusError] = useState('');

  const normalizedFilter = filterValue.trim().toLowerCase();
  const currentStatus = getStatusForTab(activeTab);
  const filteredEvents = rows.filter((event) => {
    if (event.status !== currentStatus) {
      return false;
    }

    if (!normalizedFilter) {
      return true;
    }

    return (
      event.title.toLowerCase().includes(normalizedFilter) ||
      event.submittedBy.lastName.toLowerCase().includes(normalizedFilter) ||
      (event.locationText || '').toLowerCase().includes(normalizedFilter)
    );
  });
  const pageCount = Math.max(1, Math.ceil(filteredEvents.length / EVENT_PAGE_SIZE));
  const safePage = Math.min(currentPage, pageCount);
  const pageStart = (safePage - 1) * EVENT_PAGE_SIZE;
  const pageEvents = filteredEvents.slice(pageStart, pageStart + EVENT_PAGE_SIZE);

  function handleFilterChange(value: string) {
    setFilterValue(value);
    setCurrentPage(1);
  }

  async function handleStatusChange(
    eventId: string,
    nextStatus: EventRecord['status']
  ) {
    setSavingStatusEventId(eventId);
    setStatusError('');

    try {
      const response = await fetch(`/api/events/${eventId}`, {
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
        current.map((event) =>
          event.id === eventId
            ? {
                ...event,
                status: data.status,
              }
            : event
        )
      );
      setEditingStatusEventId(null);
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : 'Failed to update status');
    } finally {
      setSavingStatusEventId(null);
    }
  }

  return (
    <div className="space-y-0">
      <div className="relative top-[2px] flex flex-wrap gap-0 pb-0">
        {EVENT_TABS.map((tab) => {
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
              <span className="admin-list-filter-label">Filter: Title, Submitter, Location</span>
              <input
                type="text"
                value={filterValue}
                onChange={(event) => handleFilterChange(event.target.value)}
                placeholder="Search by title, submitter last name, or location"
                className="admin-list-filter-input"
              />
            </label>
          </div>

          {statusError ? <div className="admin-list-error">{statusError}</div> : null}

          <div className="admin-list-table-wrap">
            <table className="admin-list-table">
              <thead className="admin-list-head">
                <tr>
                  <th className="admin-list-header-cell">Title</th>
                  <th className="admin-list-header-cell">Submitted By</th>
                  <th className="admin-list-header-cell">Starts</th>
                  <th className="admin-list-header-cell">Location</th>
                  <th className="admin-list-header-cell">Status</th>
                </tr>
              </thead>
              <tbody>
                {pageEvents.length > 0 ? (
                  pageEvents.map((event) => (
                    <tr key={event.id} className="admin-list-row">
                      <td className="admin-list-cell">
                        <Link href={`/admin/events/${event.id}`} className="admin-list-link">
                          {event.title}
                        </Link>
                      </td>
                      <td className="admin-list-cell">
                        {event.submittedBy.firstName} {event.submittedBy.lastName}
                      </td>
                      <td className="admin-list-cell">{formatDateTime(event.startDatetime)}</td>
                      <td className="admin-list-cell">{event.locationText || 'TBD'}</td>
                      <td className="admin-list-cell">
                        {editingStatusEventId === event.id ? (
                          <select
                            className="admin-list-cell-select"
                            defaultValue={event.status}
                            disabled={savingStatusEventId === event.id}
                            onBlur={() => {
                              if (savingStatusEventId !== event.id) {
                                setEditingStatusEventId(null);
                              }
                            }}
                            onChange={(entry) =>
                              handleStatusChange(event.id, entry.target.value as EventRecord['status'])
                            }
                            autoFocus
                          >
                            {EVENT_STATUS_OPTIONS.map((status) => (
                              <option key={status.value} value={status.value}>
                                {status.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <button
                            type="button"
                            className="admin-list-cell-button"
                            onClick={() => setEditingStatusEventId(event.id)}
                          >
                            {EVENT_STATUS_OPTIONS.find((status) => status.value === event.status)?.label}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="admin-list-empty" colSpan={5}>
                      No {activeTab} events match the current filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="admin-list-pagination">
            <div className="admin-list-pagination-label">
              {filteredEvents.length} {getTabLabel(activeTab).toLowerCase()} event
              {filteredEvents.length === 1 ? '' : 's'}
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
