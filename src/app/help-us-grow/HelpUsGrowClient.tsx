'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import InternalPageHeader from '@/components/shared/InternalPageHeader';
import DirectoryMessageAction from '@/app/directory/DirectoryMessageAction';
import { hasTrustedAccess } from '@/lib/trust-access';

type CandidateUser = {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  joinedAt: string;
};

type HelpUsGrowResponse = {
  community: {
    id: string;
    name: string;
  };
  users: CandidateUser[];
};

function formatJoinDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function HelpUsGrowClient() {
  const { data: session, status } = useSession();
  const [users, setUsers] = useState<CandidateUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const currentUser = session?.user as { trust_level?: string; role?: string } | undefined;
  const canAccess = hasTrustedAccess({
    trustLevel: currentUser?.trust_level,
    role: currentUser?.role,
  });

  useEffect(() => {
    if (status !== 'authenticated' || !canAccess) {
      setIsLoading(false);
      return;
    }

    let active = true;

    async function loadCandidates() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/help-us-grow', { cache: 'no-store' });
        const data: HelpUsGrowResponse | { error?: string } = await response.json();

        if (!response.ok) {
          throw new Error('error' in data && data.error ? data.error : 'Failed to load members');
        }

        if (!active) {
          return;
        }

        const payload = data as HelpUsGrowResponse;
        setUsers(payload.users);
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load members');
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadCandidates();

    return () => {
      active = false;
    };
  }, [canAccess, status]);

  const sortedUsers = useMemo(
    () =>
      [...users].sort((a, b) => {
        const lastNameCompare = a.lastName.localeCompare(b.lastName);
        if (lastNameCompare !== 0) {
          return lastNameCompare;
        }

        const firstNameCompare = a.firstName.localeCompare(b.firstName);
        if (firstNameCompare !== 0) {
          return firstNameCompare;
        }

        return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
      }),
    [users]
  );

  if (status === 'loading' || isLoading) {
    return <p className="page-intro-copy py-10 text-center">Loading...</p>;
  }

  if (!canAccess) {
    return (
      <div className="space-y-6">
        <InternalPageHeader title="Help Us Grow" />
        <div className="rounded-[28px] border border-amber-200 bg-amber-50 px-6 py-5 text-amber-900">
          This section is available to trusted members and staff only.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <InternalPageHeader
        title="Help Us Grow"
      />

      {error ? (
        <div className="rounded-[24px] border border-red-200 bg-red-50 px-5 py-4 text-red-700">
          {error}
        </div>
      ) : null}

      <section className="member-recognition-panel">
        <div className="member-recognition-panel-header px-6 py-4">
          <p className="member-recognition-panel-label text-xs font-semibold uppercase tracking-[0.28em]">
            Registered Members
          </p>
          <p className="member-recognition-panel-copy mt-2 max-w-3xl text-sm leading-6">
            Help build our trusted community by welcoming new members. If you recognize someone
            who has recently registered, reach out and start a conversation. If you can personally
            confirm their identity, not just their name, but that you know them, please vouch for
            them.
          </p>
          <p className="member-recognition-panel-copy mt-3 max-w-3xl text-sm leading-6">
            Vouching is how trust grows here. If you&apos;re unsure or can&apos;t confirm who someone is,
            hold off. Similar names can be misleading, and there are other paths to trusted
            membership.
          </p>
        </div>

        {sortedUsers.length === 0 ? (
          <div className="member-recognition-panel-empty px-6 py-10 text-center font-semibold">
            No registered members are currently waiting for recognition here.
          </div>
        ) : (
          <div className="px-6 pb-6">
            <div className="admin-list-table-wrap">
              <table className="admin-list-table">
                <thead className="admin-list-head">
                  <tr>
                    <th className="admin-list-header-cell">Member</th>
                    <th className="admin-list-header-cell">Joined</th>
                    <th className="admin-list-header-cell">Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedUsers.map((user) => (
                    <tr key={user.id} className="admin-list-row">
                      <td className="admin-list-cell">
                        <Link href={`/profile/${user.id}`} className="admin-list-link">
                          {user.displayName}
                        </Link>
                      </td>
                      <td className="admin-list-cell">{formatJoinDate(user.joinedAt)}</td>
                      <td className="admin-list-cell">
                        <DirectoryMessageAction userId={user.id} userName={user.displayName} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
