'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

type MessageDialogState = {
  userId: string;
  userName: string;
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function MessageUserDialog({
  userName,
  value,
  error,
  isLoading,
  onChange,
  onCancel,
  onSubmit,
}: {
  userName: string;
  value: string;
  error: string | null;
  isLoading: boolean;
  onChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => Promise<void>;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="directory-message-dialog-title"
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg"
      >
        <h2 id="directory-message-dialog-title" className="mb-4 text-xl font-bold text-gray-900">
          Message User
        </h2>

        <p className="mb-4 text-sm text-gray-600">
          Send a direct message to <strong>{userName}</strong>.
        </p>

        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <label htmlFor="directory-user-message" className="mb-2 block text-sm font-medium text-gray-700">
            Message
          </label>
          <textarea
            id="directory-user-message"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            rows={5}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Write your message here"
            disabled={isLoading}
            autoFocus
          />
        </div>

        {error ? <div className="mb-4 text-sm font-semibold text-red-700">{error}</div> : null}

        <div className="mt-6 flex justify-end gap-3 border-t border-gray-200 pt-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void onSubmit()}
            disabled={isLoading || value.trim().length === 0}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: '#46A8CC' }}
          >
            {isLoading ? 'Sending...' : 'Send Message'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DirectoryMessageAction({
  userId,
  userName,
}: {
  userId: string;
  userName: string;
}) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [messageDialog, setMessageDialog] = useState<MessageDialogState | null>(null);
  const [messageBody, setMessageBody] = useState('');
  const [messageError, setMessageError] = useState<string | null>(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  const isOwnProfile = currentUserId === userId;

  const handleOpenMessageDialog = () => {
    if (status !== 'authenticated' || isOwnProfile) {
      return;
    }

    setMessageDialog({ userId, userName });
    setMessageBody('');
    setMessageError(null);
  };

  const handleCloseMessageDialog = () => {
    if (isSendingMessage) {
      return;
    }

    setMessageDialog(null);
    setMessageBody('');
    setMessageError(null);
  };

  const handleSendMessage = async () => {
    if (!messageDialog) {
      return;
    }

    const trimmedBody = messageBody.trim();
    if (!trimmedBody) {
      setMessageError('Message is required.');
      return;
    }

    setIsSendingMessage(true);
    setMessageError(null);

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: messageDialog.userId,
          body: trimmedBody,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      setMessageDialog(null);
      setMessageBody('');
      router.push(`/messages/${data.conversationId}`);
    } catch (sendError: unknown) {
      setMessageError(getErrorMessage(sendError, 'Failed to send message'));
    } finally {
      setIsSendingMessage(false);
    }
  };

  if (isOwnProfile) {
    return <span className="text-sm text-slate-500">Your listing</span>;
  }

  if (status !== 'authenticated') {
    return <span className="text-sm text-slate-500">Sign in to message</span>;
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpenMessageDialog}
        className="inline-flex items-center rounded-full border border-[#46A8CC]/30 bg-[#46A8CC]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#1f6f8f] transition hover:border-[#46A8CC]/50 hover:bg-[#46A8CC]/15"
      >
        Message
      </button>

      {messageDialog ? (
        <MessageUserDialog
          userName={messageDialog.userName}
          value={messageBody}
          error={messageError}
          isLoading={isSendingMessage}
          onChange={setMessageBody}
          onCancel={handleCloseMessageDialog}
          onSubmit={handleSendMessage}
        />
      ) : null}
    </>
  );
}
