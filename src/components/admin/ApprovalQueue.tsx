'use client';

import React, { useState } from 'react';
import { Pagination } from '../shared/Pagination';

interface PendingItem {
  id: string;
  title: string;
  type: 'article' | 'event';
  author: string;
  submittedDate: string;
  preview?: string;
}

interface ApprovalQueueProps {
  items: PendingItem[];
  onApprove: (itemId: string) => Promise<void>;
  onReject: (itemId: string, reason?: string) => Promise<void>;
  isLoading?: boolean;
}

const ITEMS_PER_PAGE = 10;

export const ApprovalQueue: React.FC<ApprovalQueueProps> = ({
  items,
  onApprove,
  onReject,
  isLoading = false
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedItems = items.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  const handleReject = async (itemId: string) => {
    await onReject(itemId, rejectReason);
    setRejectingId(null);
    setRejectReason('');
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'article':
        return '#46A8CC';
      case 'event':
        return '#A51E30';
      default:
        return '#6B7280';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <p className="text-gray-500 font-medium">No pending items for approval</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Author</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Submitted</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedItems.map((item) => (
              <React.Fragment key={item.id}>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span
                      className="inline-block px-3 py-1 text-xs font-semibold text-white rounded"
                      style={{ backgroundColor: getTypeColor(item.type) }}
                    >
                      {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900 max-w-xs truncate">
                      {item.title}
                    </p>
                    {item.preview && (
                      <p className="text-xs text-gray-500 max-w-xs truncate mt-1">
                        {item.preview}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {item.author}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">
                    {formatDate(item.submittedDate)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => onApprove(item.id)}
                        disabled={isLoading}
                        className="px-3 py-1 text-xs font-medium text-white rounded bg-green-600 hover:bg-green-700 disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => setRejectingId(item.id)}
                        disabled={isLoading || rejectingId === item.id}
                        className="px-3 py-1 text-xs font-medium text-white rounded bg-red-600 hover:bg-red-700 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>

                {/* Reject Reason Modal */}
                {rejectingId === item.id && (
                  <tr className="bg-red-50">
                    <td colSpan={5} className="px-6 py-4">
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700">
                          Reason for rejection (optional):
                        </label>
                        <textarea
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Explain why this content is being rejected..."
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                          rows={3}
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => {
                              setRejectingId(null);
                              setRejectReason('');
                            }}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 text-sm font-medium"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleReject(item.id)}
                            disabled={isLoading}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium disabled:opacity-50"
                          >
                            Confirm Rejection
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-6 py-4 border-t border-gray-200">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
};
