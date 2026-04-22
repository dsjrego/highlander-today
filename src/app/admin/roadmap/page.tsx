'use client';

import { useEffect, useState } from 'react';

type RoadmapIdeaStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'DECLINED'
  | 'APPROVED_FOR_RANKING'
  | 'MERGED'
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'SHIPPED';

interface PendingRoadmapIdea {
  id: string;
  title: string;
  summary: string;
  description: string;
  status: RoadmapIdeaStatus;
  staffNotes: string | null;
  createdAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    trustLevel: string;
  };
}

interface WeightedUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  ballotCount: number;
  ballotUpdatedAt: string | null;
  multiplierPercent: number;
  rationale: string | null;
  weightUpdatedAt: string | null;
}

interface WeightChange {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  createdAt: string;
  actor: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  metadata: {
    targetUserName?: string;
    targetUserId?: string;
    previousMultiplierPercent?: number;
    multiplierPercent?: number;
    rationale?: string | null;
  } | null;
}

interface WeightConstraints {
  domain: string;
  defaultMultiplierPercent: number;
  minMultiplierPercent: number;
  maxMultiplierPercent: number;
}

const MODERATION_OPTIONS: Array<{ value: Exclude<RoadmapIdeaStatus, 'SUBMITTED'>; label: string }> = [
  { value: 'UNDER_REVIEW', label: 'Move to Under Review' },
  { value: 'APPROVED_FOR_RANKING', label: 'Approve for Ranking' },
  { value: 'DECLINED', label: 'Decline' },
  { value: 'PLANNED', label: 'Mark Planned' },
  { value: 'IN_PROGRESS', label: 'Mark In Progress' },
  { value: 'SHIPPED', label: 'Mark Shipped' },
  { value: 'MERGED', label: 'Merge into Another Idea' },
];

export default function AdminRoadmapPage() {
  const [ideas, setIdeas] = useState<PendingRoadmapIdea[]>([]);
  const [weightedUsers, setWeightedUsers] = useState<WeightedUser[]>([]);
  const [recentWeightChanges, setRecentWeightChanges] = useState<WeightChange[]>([]);
  const [weightConstraints, setWeightConstraints] = useState<WeightConstraints | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWeightsLoading, setIsWeightsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [weightActionLoading, setWeightActionLoading] = useState<string | null>(null);
  const [notesByIdea, setNotesByIdea] = useState<Record<string, string>>({});
  const [statusByIdea, setStatusByIdea] = useState<Record<string, Exclude<RoadmapIdeaStatus, 'SUBMITTED'>>>({});
  const [mergeTargetByIdea, setMergeTargetByIdea] = useState<Record<string, string>>({});
  const [weightByUser, setWeightByUser] = useState<Record<string, number>>({});
  const [rationaleByUser, setRationaleByUser] = useState<Record<string, string>>({});
  const [weightSearch, setWeightSearch] = useState('');

  useEffect(() => {
    fetchQueue();
    fetchWeights();
  }, []);

  async function fetchQueue() {
    setIsLoading(true);
    try {
      const res = await fetch('/api/roadmap?reviewQueue=1&limit=100');
      const data = await res.json();

      if (res.ok) {
        setIdeas(data.ideas || []);
      }
    } catch (error) {
      console.error('Failed to fetch roadmap queue:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchWeights(search = '') {
    setIsWeightsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) {
        params.set('search', search.trim());
      }

      const res = await fetch(`/api/admin/roadmap/weights${params.toString() ? `?${params.toString()}` : ''}`);
      const data = await res.json();

      if (res.ok) {
        setWeightedUsers(data.users || []);
        setRecentWeightChanges(data.recentChanges || []);
        setWeightConstraints(data.constraints || null);
      }
    } catch (error) {
      console.error('Failed to fetch roadmap weights:', error);
    } finally {
      setIsWeightsLoading(false);
    }
  }

  async function moderateIdea(ideaId: string) {
    const nextStatus = statusByIdea[ideaId] || 'UNDER_REVIEW';
    setActionLoading(ideaId);

    try {
      const res = await fetch(`/api/roadmap/${ideaId}/moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStatus,
          staffNotes: notesByIdea[ideaId] || undefined,
          mergedIntoIdeaId: nextStatus === 'MERGED' ? mergeTargetByIdea[ideaId] || undefined : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Failed to update roadmap idea');
        return;
      }

      if (['APPROVED_FOR_RANKING', 'PLANNED', 'IN_PROGRESS', 'SHIPPED', 'MERGED'].includes(nextStatus)) {
        setIdeas((current) => current.filter((idea) => idea.id !== ideaId));
      } else {
        setIdeas((current) =>
          current.map((idea) => (idea.id === ideaId ? { ...idea, status: data.status, staffNotes: data.staffNotes } : idea))
        );
      }
    } catch {
      alert('Failed to update roadmap idea');
    } finally {
      setActionLoading(null);
    }
  }

  async function saveWeight(userId: string) {
    setWeightActionLoading(userId);
    try {
      const res = await fetch('/api/admin/roadmap/weights', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          multiplierPercent: weightByUser[userId] ?? 100,
          rationale: rationaleByUser[userId] ?? '',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to update roadmap influence weight');
        return;
      }

      setWeightedUsers((current) =>
        current.map((user) =>
          user.id === userId
            ? {
                ...user,
                multiplierPercent: data.multiplierPercent,
                rationale: data.rationale,
                weightUpdatedAt: new Date().toISOString(),
              }
            : user
        )
      );
      fetchWeights(weightSearch);
    } catch {
      alert('Failed to update roadmap influence weight');
    } finally {
      setWeightActionLoading(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8 pb-3 border-b-2" style={{ borderColor: 'var(--brand-accent)' }}>
        Roadmap Moderation
      </h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-8">
        <p className="text-sm text-gray-600">
          Review trusted-user roadmap ideas here. You can move ideas into active review, approve them for the public ranking pool, decline them with notes, merge duplicates, or advance them into planned and shipped states.
        </p>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
          Loading roadmap queue...
        </div>
      ) : ideas.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
          No roadmap ideas are waiting for review right now.
        </div>
      ) : (
        <div className="space-y-5">
          {ideas.map((idea) => {
            const selectedStatus = statusByIdea[idea.id] || 'UNDER_REVIEW';

            return (
              <div key={idea.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="mb-4">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                      {idea.status.split('_').join(' ')}
                    </span>
                    <span className="text-sm text-gray-400">
                      Submitted {new Date(idea.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">{idea.title}</h2>
                  <p className="text-sm text-gray-500 mb-3">
                    by {idea.author.firstName} {idea.author.lastName} ({idea.author.trustLevel})
                  </p>
                  <p className="text-gray-700 mb-4">{idea.summary}</p>
                  <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-700 whitespace-pre-wrap">
                    {idea.description}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Next Status
                    </label>
                    <select
                      value={selectedStatus}
                      onChange={(event) =>
                        setStatusByIdea((current) => ({
                          ...current,
                          [idea.id]: event.target.value as Exclude<RoadmapIdeaStatus, 'SUBMITTED'>,
                        }))
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                    >
                      {MODERATION_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Staff Notes
                    </label>
                    <textarea
                      value={notesByIdea[idea.id] ?? idea.staffNotes ?? ''}
                      onChange={(event) =>
                        setNotesByIdea((current) => ({
                          ...current,
                          [idea.id]: event.target.value,
                        }))
                      }
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                      placeholder="Explain the decision, ask for clarification, or note how this idea was reframed."
                    />
                  </div>
                </div>

                {selectedStatus === 'MERGED' ? (
                  <div className="mt-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Merge Target Idea ID
                    </label>
                    <input
                      type="text"
                      value={mergeTargetByIdea[idea.id] || ''}
                      onChange={(event) =>
                        setMergeTargetByIdea((current) => ({
                          ...current,
                          [idea.id]: event.target.value,
                        }))
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                      placeholder="Paste the destination idea ID"
                    />
                  </div>
                ) : null}

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => moderateIdea(idea.id)}
                    disabled={actionLoading === idea.id}
                    className="px-5 py-2 text-white font-semibold rounded-lg hover:opacity-90 transition disabled:opacity-50"
                    style={{ backgroundColor: 'var(--brand-accent)' }}
                  >
                    {actionLoading === idea.id ? 'Saving...' : 'Apply Decision'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-12">
        <h2 className="text-xl font-bold mb-4">Roadmap Influence Weights</h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
          <p className="text-sm text-gray-600 mb-4">
            These are roadmap-only weighting overrides for Milestone 4. The normal multiplier is {weightConstraints?.defaultMultiplierPercent ?? 100}%. Keep changes small and justified. This does not affect any other domain.
          </p>
          <p className="text-xs text-gray-500 mb-4">
            Allowed range: {weightConstraints?.minMultiplierPercent ?? 90}% to {weightConstraints?.maxMultiplierPercent ?? 110}%. Returning a user to {weightConstraints?.defaultMultiplierPercent ?? 100}% with a blank rationale removes the override.
          </p>
          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="search"
              value={weightSearch}
              onChange={(event) => setWeightSearch(event.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
              placeholder="Search trusted users by name or email"
            />
            <button
              type="button"
              onClick={() => fetchWeights(weightSearch)}
              className="px-4 py-2 text-white font-semibold rounded-lg hover:opacity-90 transition"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              Search
            </button>
          </div>
        </div>

        {isWeightsLoading ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
            Loading roadmap influence weights...
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-6">
            <div className="space-y-4">
              {weightedUsers.map((user) => (
                <div key={user.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {user.firstName} {user.lastName}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {user.email} • {user.role}
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        Ballot items saved: {user.ballotCount}
                        {user.ballotUpdatedAt ? ` • last ballot ${new Date(user.ballotUpdatedAt).toLocaleString()}` : ''}
                      </p>
                    </div>
                    <div className="rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700">
                      Current roadmap weight: {user.multiplierPercent}%
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-[180px_1fr_auto] gap-4 items-start">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Multiplier
                      </label>
                      <input
                        type="number"
                        min={weightConstraints?.minMultiplierPercent ?? 90}
                        max={weightConstraints?.maxMultiplierPercent ?? 110}
                        step={1}
                        value={weightByUser[user.id] ?? user.multiplierPercent}
                        onChange={(event) =>
                          setWeightByUser((current) => ({
                            ...current,
                            [user.id]: Number(event.target.value),
                          }))
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Rationale
                      </label>
                      <textarea
                        rows={3}
                        value={rationaleByUser[user.id] ?? user.rationale ?? ''}
                        onChange={(event) =>
                          setRationaleByUser((current) => ({
                            ...current,
                            [user.id]: event.target.value,
                          }))
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                        placeholder="Required for any non-default roadmap-specific weight adjustment."
                      />
                    </div>
                    <div className="flex lg:justify-end">
                      <button
                        type="button"
                        onClick={() => saveWeight(user.id)}
                        disabled={weightActionLoading === user.id}
                        className="px-5 py-2 text-white font-semibold rounded-lg hover:opacity-90 transition disabled:opacity-50"
                        style={{ backgroundColor: 'var(--brand-accent)' }}
                      >
                        {weightActionLoading === user.id ? 'Saving...' : 'Save Weight'}
                      </button>
                    </div>
                  </div>

                  {user.weightUpdatedAt ? (
                    <p className="mt-3 text-xs text-gray-400">
                      Last weight update: {new Date(user.weightUpdatedAt).toLocaleString()}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 h-fit">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Recent Weight Changes</h3>
              {recentWeightChanges.length === 0 ? (
                <p className="text-sm text-gray-500">No roadmap weight changes have been logged yet.</p>
              ) : (
                <div className="space-y-4">
                  {recentWeightChanges.map((change) => (
                    <div key={change.id} className="border-b border-gray-100 pb-4 last:border-b-0 last:pb-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {change.metadata?.targetUserName || change.metadata?.targetUserId || 'User'}
                      </p>
                      <p className="text-xs uppercase tracking-wide text-gray-400 mt-1">
                        {change.action} • {new Date(change.createdAt).toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-600 mt-2">
                        {typeof change.metadata?.previousMultiplierPercent === 'number'
                          ? `${change.metadata.previousMultiplierPercent}% -> ${change.metadata.multiplierPercent ?? 100}%`
                          : `${change.metadata?.multiplierPercent ?? 100}%`}
                      </p>
                      {change.metadata?.rationale ? (
                        <p className="text-sm text-gray-500 mt-2 whitespace-pre-wrap">
                          {change.metadata.rationale}
                        </p>
                      ) : null}
                      <p className="text-xs text-gray-400 mt-2">
                        by {change.actor.firstName} {change.actor.lastName}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
