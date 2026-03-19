'use client';

import React, { useState } from 'react';
import { Pagination } from '../shared/Pagination';

interface BannedAccount {
  id: string;
  email: string;
  bannedDate: string;
  reason?: string;
  bannedBy: string;
}

interface BannedAccountsTableProps {
  accounts: BannedAccount[];
  onUnban: (accountId: string) => Promise<void>;
  isLoading?: boolean;
}

const ITEMS_PER_PAGE = 20;

export const BannedAccountsTable: React.FC<BannedAccountsTableProps> = ({
  accounts,
  onUnban,
  isLoading = false
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [unbanningId, setUnbanningId] = useState<string | null>(null);

  const totalPages = Math.ceil(accounts.length / ITEMS_PER_PAGE);
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedAccounts = accounts.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  const handleUnban = async (accountId: string) => {
    await onUnban(accountId);
    setUnbanningId(null);
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

  if (accounts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <p className="text-gray-500 font-medium">No banned accounts</p>
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Banned Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Banned By</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Reason</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedAccounts.map((account) => (
              <React.Fragment key={account.id}>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {account.email}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">
                    {formatDate(account.bannedDate)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {account.bannedBy}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs">
                    {account.reason || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setUnbanningId(account.id)}
                      disabled={isLoading || unbanningId === account.id}
                      className="px-3 py-1 text-xs font-medium text-white rounded bg-green-600 hover:bg-green-700 disabled:opacity-50"
                    >
                      Unban
                    </button>
                  </td>
                </tr>

                {/* Unban Confirmation */}
                {unbanningId === account.id && (
                  <tr className="bg-green-50">
                    <td colSpan={5} className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Confirm unbanning {account.email}?
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            This user will be able to register again and access the platform.
                          </p>
                        </div>
                        <div className="flex gap-2 ml-auto flex-shrink-0">
                          <button
                            onClick={() => setUnbanningId(null)}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 text-sm font-medium"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleUnban(account.id)}
                            disabled={isLoading}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50"
                          >
                            Confirm Unban
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
