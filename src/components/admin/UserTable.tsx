'use client';

import React, { useState } from 'react';
import { TrustBadge } from '../trust/TrustBadge';
import { Pagination } from '../shared/Pagination';

interface User {
  id: string;
  name: string;
  email: string;
  trustLevel: 'trusted' | 'under_review' | 'untrusted' | 'suspended';
  role: 'user' | 'editor' | 'admin';
  joinedDate: string;
  vouchCount: number;
}

interface UserTableProps {
  users: User[];
  onVouch?: (userId: string) => Promise<void>;
  onRevokeVouch?: (userId: string) => Promise<void>;
  onBan?: (userId: string) => Promise<void>;
  isLoading?: boolean;
}

const ITEMS_PER_PAGE = 20;

export const UserTable: React.FC<UserTableProps> = ({
  users,
  onVouch,
  onRevokeVouch,
  onBan,
  isLoading = false
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [trustLevelFilter, setTrustLevelFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const filteredUsers = users.filter((user) => {
    if (trustLevelFilter !== 'all' && user.trustLevel !== trustLevelFilter) {
      return false;
    }
    if (roleFilter !== 'all' && user.role !== roleFilter) {
      return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedUsers = filteredUsers.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return '#A51E30';
      case 'editor':
        return '#F59E0B';
      default:
        return '#6B7280';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Filters */}
      <div className="px-6 py-4 border-b border-gray-200 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="trustFilter" className="block text-sm font-medium text-gray-700 mb-2">
              Trust Level
            </label>
            <select
              id="trustFilter"
              value={trustLevelFilter}
              onChange={(e) => {
                setTrustLevelFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="trusted">Trusted</option>
              <option value="under_review">Under Review</option>
              <option value="untrusted">Untrusted</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <div>
            <label htmlFor="roleFilter" className="block text-sm font-medium text-gray-700 mb-2">
              Role
            </label>
            <select
              id="roleFilter"
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="user">User</option>
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Trust</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Joined</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Vouches</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.name}</td>
                <td className="px-6 py-4 text-sm text-gray-700">{user.email}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <TrustBadge trustLevel={user.trustLevel} />
                    <span className="text-xs text-gray-600 capitalize">
                      {user.trustLevel.replace('_', ' ')}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className="inline-block px-2 py-1 text-xs font-semibold text-white rounded capitalize"
                    style={{ backgroundColor: getRoleColor(user.role) }}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-xs text-gray-500">
                  {formatDate(user.joinedDate)}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  {user.vouchCount}
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    {user.trustLevel !== 'trusted' && onVouch && (
                      <button
                        onClick={() => onVouch(user.id)}
                        disabled={isLoading}
                        className="px-3 py-1 text-xs font-medium text-white rounded bg-green-600 hover:bg-green-700 disabled:opacity-50"
                      >
                        Vouch
                      </button>
                    )}
                    {user.trustLevel === 'trusted' && onRevokeVouch && (
                      <button
                        onClick={() => onRevokeVouch(user.id)}
                        disabled={isLoading}
                        className="px-3 py-1 text-xs font-medium text-white rounded bg-orange-600 hover:bg-orange-700 disabled:opacity-50"
                      >
                        Revoke
                      </button>
                    )}
                    {user.trustLevel !== 'suspended' && onBan && (
                      <button
                        onClick={() => onBan(user.id)}
                        disabled={isLoading}
                        className="px-3 py-1 text-xs font-medium text-white rounded bg-red-600 hover:bg-red-700 disabled:opacity-50"
                      >
                        Ban
                      </button>
                    )}
                  </div>
                </td>
              </tr>
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
