'use client';

import React, { useState } from 'react';
import { Pagination } from '../shared/Pagination';

/**
 * AuditLogTable — reusable table for displaying unified audit entries.
 *
 * Accepts pre-fetched entries from the parent component.
 * Handles client-side filtering and pagination for smaller datasets.
 * For server-side pagination, use the admin audit page directly.
 */

interface AuditEntry {
  id: string;
  source: 'trust' | 'activity' | 'login';
  timestamp: string;
  action: string;
  actionRaw: string;
  actor: { id: string; name: string; email: string };
  target: { id: string; name: string; email?: string; type: string } | null;
  details: string | null;
  ipAddress: string | null;
}

interface AuditLogTableProps {
  entries: AuditEntry[];
  showSource?: boolean;
  pageSize?: number;
}

const ITEMS_PER_PAGE = 25;

export const AuditLogTable: React.FC<AuditLogTableProps> = ({
  entries,
  showSource = true,
  pageSize = ITEMS_PER_PAGE,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const filteredEntries = entries.filter((entry) => {
    if (actionFilter !== 'all' && entry.actionRaw !== actionFilter) return false;
    if (sourceFilter !== 'all' && entry.source !== sourceFilter) return false;
    if (startDate) {
      if (new Date(entry.timestamp).getTime() < new Date(startDate).getTime()) return false;
    }
    if (endDate) {
      if (new Date(entry.timestamp).getTime() > new Date(endDate + 'T23:59:59').getTime()) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredEntries.length / pageSize);
  const startIdx = (currentPage - 1) * pageSize;
  const paginatedEntries = filteredEntries.slice(startIdx, startIdx + pageSize);

  const actions = Array.from(new Set(entries.map((e) => e.actionRaw))).sort();
  const sources = Array.from(new Set(entries.map((e) => e.source))).sort();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getActionColor = (entry: AuditEntry) => {
    const { actionRaw, source } = entry;
    if (actionRaw === 'ANOMALY_LOGIN') return '#DC2626';
    if (source === 'trust') {
      if (['BANNED', 'TRUST_REVOKED', 'SUSPENDED'].includes(actionRaw)) return '#DC2626';
      if (['TRUST_GRANTED', 'REINSTATED', 'UNBANNED'].includes(actionRaw)) return '#10B981';
      return '#F59E0B';
    }
    if (source === 'activity') {
      if (actionRaw === 'CREATE') return '#10B981';
      if (actionRaw === 'DELETE') return '#DC2626';
      if (['UPDATE', 'PUBLISH', 'UNPUBLISH'].includes(actionRaw)) return '#F59E0B';
      if (actionRaw === 'APPROVE') return '#3B82F6';
      if (['REJECT', 'FLAG'].includes(actionRaw)) return '#EF4444';
      return '#6B7280';
    }
    return '#6B7280';
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'trust': return 'Trust';
      case 'activity': return 'Activity';
      case 'login': return 'Login';
      default: return source;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Filters */}
      <div className="px-6 py-4 border-b border-gray-200 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label htmlFor="actionFilter" className="block text-sm font-medium text-gray-700 mb-2">
              Action
            </label>
            <select
              id="actionFilter"
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              {actions.map((action) => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
          </div>

          {showSource && (
            <div>
              <label htmlFor="sourceFilter" className="block text-sm font-medium text-gray-700 mb-2">
                Source
              </label>
              <select
                id="sourceFilter"
                value={sourceFilter}
                onChange={(e) => { setSourceFilter(e.target.value); setCurrentPage(1); }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All</option>
                {sources.map((source) => (
                  <option key={source} value={source}>{getSourceLabel(source)}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
              From Date
            </label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
              To Date
            </label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Timestamp</th>
              {showSource && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Source</th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Action</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Target</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">IP</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedEntries.length === 0 ? (
              <tr>
                <td colSpan={showSource ? 7 : 6} className="px-6 py-8 text-center text-gray-500">
                  No entries match the current filters.
                </td>
              </tr>
            ) : (
              paginatedEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">
                    {formatDate(entry.timestamp)}
                  </td>
                  {showSource && (
                    <td className="px-6 py-4 text-xs text-gray-600 capitalize">
                      {entry.source}
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{entry.actor.name}</div>
                    <div className="text-xs text-gray-500">{entry.actor.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="inline-block px-2 py-1 text-xs font-semibold text-white rounded"
                      style={{ backgroundColor: getActionColor(entry) }}
                    >
                      {entry.action}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {entry.target ? (
                      <div className="text-sm">
                        <p className="font-medium text-gray-900">{entry.target.name}</p>
                        <p className="text-xs text-gray-500">({entry.target.type})</p>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-600 font-mono">
                    {entry.ipAddress || <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                    {entry.details || '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
};
