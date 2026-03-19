'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

interface SendMessageButtonProps {
  profileUserId: string;
}

interface BlockStatusResponse {
  blockedByYou: boolean;
  hasBlockedYou: boolean;
  canMessage: boolean;
}

export default function SendMessageButton({
  profileUserId,
}: SendMessageButtonProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [canMessage, setCanMessage] = useState(true);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  const isOwnProfile = currentUserId === profileUserId;

  useEffect(() => {
    let active = true;

    async function loadBlockStatus() {
      if (status !== 'authenticated' || isOwnProfile) {
        return;
      }

      setIsLoadingStatus(true);
      setError(null);

      try {
        const res = await fetch(`/api/users/${profileUserId}/block`, {
          cache: 'no-store',
        });
        const data: BlockStatusResponse | { error?: string } = await res.json();

        if (!res.ok) {
          throw new Error(
            'error' in data && data.error
              ? data.error
              : 'Failed to load messaging availability'
          );
        }

        if (!active) {
          return;
        }

        const payload = data as BlockStatusResponse;
        setCanMessage(payload.canMessage);
        setStatusNote(
          payload.blockedByYou
            ? 'You blocked this user.'
            : payload.hasBlockedYou
              ? 'This user has blocked you.'
              : null
        );
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to load messaging availability'
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

  async function handleClick() {
    if (status !== 'authenticated' || isOwnProfile || !canMessage) {
      return;
    }

    setIsLoading(true);
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

      router.push(`/messages/${data.conversationId}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to open conversation'
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (status !== 'authenticated' || isOwnProfile) {
    return null;
  }

  return (
    <div className="flex-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading || isLoadingStatus || !canMessage}
        className="w-full text-white px-6 py-3 rounded-full font-semibold shadow-sm hover:shadow-md transition-shadow duration-200 disabled:opacity-60"
        style={{ backgroundColor: '#A51E30' }}
      >
        {isLoading
          ? 'Opening...'
          : canMessage
            ? 'Send Message'
            : 'Messaging Unavailable'}
      </button>
      {statusNote ? <p className="mt-2 text-sm text-gray-600">{statusNote}</p> : null}
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
