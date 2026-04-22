'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import StatusMessage from '@/components/shared/StatusMessage';

interface BlockStatusResponse {
  blockedByYou: boolean;
  hasBlockedYou: boolean;
  canMessage: boolean;
  canBlock: boolean;
}

interface ProfileInteractionControlsProps {
  profileUserId: string;
}

export default function ProfileInteractionControls({
  profileUserId,
}: ProfileInteractionControlsProps) {
  const { data: session, status } = useSession();
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  const isOwnProfile = currentUserId === profileUserId;

  const [blockStatus, setBlockStatus] = useState<BlockStatusResponse | null>(
    null
  );
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isMutatingBlock, setIsMutatingBlock] = useState(false);
  const [isOpeningMessage, setIsOpeningMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadBlockStatus() {
      if (status !== 'authenticated' || isOwnProfile) {
        return;
      }

      setIsLoadingStatus(true);

      try {
        const res = await fetch(`/api/users/${profileUserId}/block`, {
          cache: 'no-store',
        });
        const data: BlockStatusResponse | { error?: string } = await res.json();

        if (!res.ok) {
          throw new Error(
            'error' in data && data.error
              ? data.error
              : 'Failed to load interaction state'
          );
        }

        if (active) {
          setBlockStatus(data as BlockStatusResponse);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to load interaction state'
          );
        }
      } finally {
        if (active) {
          setIsLoadingStatus(false);
        }
      }
    }

    loadBlockStatus();

    return () => {
      active = false;
    };
  }, [profileUserId, status, isOwnProfile]);

  async function openConversation() {
    if (status !== 'authenticated' || isOwnProfile || !blockStatus?.canMessage) {
      return;
    }

    setIsOpeningMessage(true);
    setError(null);

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: profileUserId,
          createOnly: true,
        }),
      });

      const data: { conversationId?: string; error?: string } = await res.json();

      if (!res.ok || !data.conversationId) {
        throw new Error(data.error || 'Failed to open conversation');
      }

      window.location.href = `/messages/${data.conversationId}`;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to open conversation'
      );
    } finally {
      setIsOpeningMessage(false);
    }
  }

  async function toggleBlock() {
    if (status !== 'authenticated' || isOwnProfile || !blockStatus?.canBlock) {
      return;
    }

    setIsMutatingBlock(true);
    setError(null);

    try {
      const isBlocked = blockStatus.blockedByYou;
      const res = await fetch(`/api/users/${profileUserId}/block`, {
        method: isBlocked ? 'DELETE' : 'POST',
      });
      const data: { error?: string } = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update block');
      }

      setBlockStatus((current) =>
        current
          ? {
              ...current,
              blockedByYou: !isBlocked,
              canMessage: isBlocked ? !current.hasBlockedYou : false,
            }
          : current
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update block');
    } finally {
      setIsMutatingBlock(false);
    }
  }

  if (status !== 'authenticated' || isOwnProfile) {
    return null;
  }

  const controlsDisabled = isLoadingStatus || !blockStatus;

  return (
    <div>
      <div className="flex gap-4">
        <button
          type="button"
          onClick={openConversation}
          disabled={
            controlsDisabled || isOpeningMessage || !blockStatus?.canMessage
          }
          className="flex-1 text-white px-6 py-3 rounded-full font-semibold shadow-sm hover:shadow-md transition-shadow duration-200 disabled:opacity-60"
          style={{ backgroundColor: 'var(--brand-accent)' }}
        >
          {isOpeningMessage
            ? 'Opening...'
            : blockStatus?.canMessage
              ? 'Send Message'
              : 'Messaging Unavailable'}
        </button>

        {blockStatus?.canBlock ? (
          <button
            type="button"
            onClick={toggleBlock}
            disabled={controlsDisabled || isMutatingBlock}
            className="flex-1 px-6 py-3 rounded-full font-semibold border transition-shadow duration-200 disabled:opacity-60"
          >
            {isMutatingBlock
              ? blockStatus.blockedByYou
                ? 'Unblocking...'
                : 'Blocking...'
              : blockStatus.blockedByYou
                ? 'Unblock User'
                : 'Block User'}
          </button>
        ) : null}
      </div>

      {blockStatus?.blockedByYou ? (
        <p className="mt-2 text-sm text-gray-600">
          You blocked this user. Messaging is disabled until you unblock them.
        </p>
      ) : null}

      {blockStatus?.hasBlockedYou ? (
        <p className="mt-2 text-sm text-gray-600">
          This user has blocked you. Messaging is unavailable.
        </p>
      ) : null}

      {error ? (
        <StatusMessage variant="error" title="Profile action failed" className="mt-3">
          <p>{error}</p>
        </StatusMessage>
      ) : null}
    </div>
  );
}
