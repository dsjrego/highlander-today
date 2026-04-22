'use client';

import React from 'react';
import Link from 'next/link';
import { TrustBadge } from '../trust/TrustBadge';

interface Conversation {
  id: string;
  participantName: string;
  participantTrustLevel: 'trusted' | 'under_review' | 'untrusted';
  lastMessage: string;
  lastMessageDate: string;
  unreadCount: number;
}

interface ConversationListProps {
  conversations: Conversation[];
  onSelect?: (conversationId: string) => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  onSelect
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  if (conversations.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <p className="text-gray-500 font-medium">No conversations yet</p>
        <p className="text-gray-400 text-sm">Start a conversation with someone from the community</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="divide-y divide-gray-200">
        {conversations.map((conversation) => (
          <Link
            key={conversation.id}
            href={`/messages/${conversation.id}`}
            onClick={() => onSelect?.(conversation.id)}
            className="block hover:bg-gray-50 transition-colors"
          >
            <div className="p-4 flex items-start gap-4">
              {/* Avatar Circle */}
              <div
                className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold"
                style={{ backgroundcolor: 'var(--brand-primary)' }}
              >
                {conversation.participantName.charAt(0).toUpperCase()}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{conversation.participantName}</span>
                    <TrustBadge trustLevel={conversation.participantTrustLevel} />
                  </div>
                  <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                    {formatDate(conversation.lastMessageDate)}
                  </span>
                </div>

                <p className="text-sm text-gray-600 truncate">
                  {conversation.lastMessage}
                </p>
              </div>

              {/* Unread Indicator */}
              {conversation.unreadCount > 0 && (
                <div
                  className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: 'var(--brand-accent)' }}
                >
                  {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
