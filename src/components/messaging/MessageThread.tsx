'use client';

import React, { useState, useRef, useEffect } from 'react';
import { TrustBadge } from '../trust/TrustBadge';

interface Message {
  id: string;
  content: string;
  authorName: string;
  authorTrustLevel: 'trusted' | 'under_review' | 'untrusted';
  isCurrentUser: boolean;
  date: string;
  attachments?: Array<{
    id: string;
    filename: string;
    url: string;
    type: string;
  }>;
}

interface MessageThreadProps {
  messages: Message[];
  participantName: string;
  participantTrustLevel: 'trusted' | 'under_review' | 'untrusted';
  onSendMessage: (content: string, attachments?: File[]) => Promise<void>;
  isLoading?: boolean;
}

export const MessageThread: React.FC<MessageThreadProps> = ({
  messages,
  participantName,
  participantTrustLevel,
  onSendMessage,
  isLoading = false
}) => {
  const [messageContent, setMessageContent] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!messageContent.trim() && attachments.length === 0) return;

    setIsSending(true);
    try {
      await onSendMessage(messageContent, attachments);
      setMessageContent('');
      setAttachments([]);
    } finally {
      setIsSending(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setAttachments([...attachments, ...Array.from(files)]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              {participantName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">{participantName}</h2>
              <div className="flex items-center gap-2">
                <TrustBadge trustLevel={participantTrustLevel} />
                <span className="text-xs text-gray-500">
                  {participantTrustLevel === 'trusted' ? 'Trusted' : 'Verify before trading'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p className="text-sm">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isCurrentUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                  message.isCurrentUser
                    ? 'bg-[var(--article-card-badge-bg)]0 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
                style={
                  message.isCurrentUser
                    ? { backgroundColor: 'var(--brand-primary)' }
                    : undefined
                }
              >
                {!message.isCurrentUser && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold">{message.authorName}</span>
                    <TrustBadge trustLevel={message.authorTrustLevel} />
                  </div>
                )}

                <p className="text-sm break-words">{message.content}</p>

                {/* Attachments */}
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {message.attachments.map((attachment) => (
                      <a
                        key={attachment.id}
                        href={attachment.url}
                        download
                        className={`flex items-center gap-2 p-2 rounded text-xs underline hover:opacity-80 ${
                          message.isCurrentUser
                            ? 'bg-blue-600 text-blue-100'
                            : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        {attachment.filename}
                      </a>
                    ))}
                  </div>
                )}

                <span className={`text-xs mt-2 block opacity-70 ${
                  message.isCurrentUser ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {formatDate(message.date)}
                </span>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        {/* Attachment Preview */}
        {attachments.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-white border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="truncate flex-1">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(index)}
                  className="text-red-600 hover:text-red-900"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          {/* Message Input */}
          <textarea
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) {
                handleSendMessage();
              }
            }}
            placeholder="Type a message... (Ctrl+Enter to send)"
            className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={3}
            disabled={isSending || isLoading}
          />

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            <label
              className="flex items-center justify-center w-10 h-10 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 cursor-pointer transition-colors"
              title="Attach file"
            >
              <input
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isSending || isLoading}
              />
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </label>

            <button
              type="button"
              onClick={handleSendMessage}
              disabled={(!messageContent.trim() && attachments.length === 0) || isSending || isLoading}
              className="flex items-center justify-center w-10 h-10 rounded-lg text-white font-bold disabled:opacity-50 transition-colors"
              style={{ backgroundColor: 'var(--brand-primary)' }}
              title="Send message"
            >
              {isSending ? '...' : '→'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
