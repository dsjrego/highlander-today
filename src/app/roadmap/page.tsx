'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';

type RoadmapIdeaStatus =
  | 'APPROVED_FOR_RANKING'
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'SHIPPED';

interface RoadmapLeaderboardEntry {
  ideaId: string;
  score: number;
  rawScore: number;
  ballotCount: number;
  averageRank: number;
  position: number;
}

interface RoadmapIdea {
  id: string;
  title: string;
  summary: string;
  description: string;
  status: RoadmapIdeaStatus;
  publishedAt: string | null;
  plannedAt: string | null;
  startedAt: string | null;
  shippedAt: string | null;
  createdAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    trustLevel: string;
  };
  _count: {
    ballotItems: number;
  };
  leaderboard: RoadmapLeaderboardEntry | null;
}

interface RoadmapResponse {
  ideas: RoadmapIdea[];
  counts: Partial<Record<RoadmapIdeaStatus, number>>;
  leaderboard: RoadmapLeaderboardEntry[];
  viewerBallot: string[];
  transparency: {
    weightedVoterCount: number;
    totalBallotCount: number;
    multiplierRange: {
      min: number;
      max: number;
    };
  };
}

const STATUS_LABELS: Record<RoadmapIdeaStatus | 'ALL', string> = {
  ALL: 'All',
  APPROVED_FOR_RANKING: 'Ranking Pool',
  PLANNED: 'Planned',
  IN_PROGRESS: 'In Progress',
  SHIPPED: 'Shipped',
};

const STATUS_STYLES: Record<RoadmapIdeaStatus, string> = {
  APPROVED_FOR_RANKING: 'bg-sky-100 text-sky-800',
  PLANNED: 'bg-indigo-100 text-indigo-800',
  IN_PROGRESS: 'bg-orange-100 text-orange-800',
  SHIPPED: 'bg-emerald-100 text-emerald-800',
};

const MAX_BALLOT_SIZE = 5;

export default function RoadmapPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [ideas, setIdeas] = useState<RoadmapIdea[]>([]);
  const [counts, setCounts] = useState<Partial<Record<RoadmapIdeaStatus, number>>>({});
  const [leaderboard, setLeaderboard] = useState<RoadmapLeaderboardEntry[]>([]);
  const [ballotIdeaIds, setBallotIdeaIds] = useState<string[]>([]);
  const [transparency, setTransparency] = useState<RoadmapResponse['transparency'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingBallot, setIsSavingBallot] = useState(false);
  const [error, setError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<RoadmapIdeaStatus | 'ALL'>('ALL');

  const isTrusted =
    sessionStatus === 'authenticated' &&
    (session?.user as { trust_level?: string } | undefined)?.trust_level === 'TRUSTED';

  async function fetchIdeas() {
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/roadmap?limit=100');
      const data: RoadmapResponse | { error?: string } = await res.json();

      if (!res.ok) {
        throw new Error((data as { error?: string }).error || 'Failed to fetch roadmap ideas');
      }

      const payload = data as RoadmapResponse;
      setIdeas(payload.ideas || []);
      setCounts(payload.counts || {});
      setLeaderboard(payload.leaderboard || []);
      setBallotIdeaIds(payload.viewerBallot || []);
      setTransparency(payload.transparency || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch roadmap ideas');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchIdeas();
  }, []);

  const ideasById = useMemo(
    () => new Map(ideas.map((idea) => [idea.id, idea])),
    [ideas]
  );

  const rankingIdeas = useMemo(
    () =>
      ideas
        .filter((idea) => idea.status === 'APPROVED_FOR_RANKING')
        .sort((a, b) => {
          const left = a.leaderboard?.position ?? Number.MAX_SAFE_INTEGER;
          const right = b.leaderboard?.position ?? Number.MAX_SAFE_INTEGER;

          if (left !== right) {
            return left - right;
          }

          return a.title.localeCompare(b.title);
        }),
    [ideas]
  );

  const selectedBallotIdeas = useMemo(
    () => ballotIdeaIds.map((ideaId) => ideasById.get(ideaId)).filter(Boolean) as RoadmapIdea[],
    [ballotIdeaIds, ideasById]
  );

  const filteredIdeas = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return ideas.filter((idea) => {
      const statusMatch = selectedStatus === 'ALL' || idea.status === selectedStatus;
      const searchMatch =
        !normalizedSearch ||
        [idea.title, idea.summary, idea.description, idea.author.firstName, idea.author.lastName]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedSearch));

      return statusMatch && searchMatch;
    });
  }, [ideas, searchTerm, selectedStatus]);

  function addToBallot(ideaId: string) {
    setSaveMessage('');
    setBallotIdeaIds((current) => {
      if (current.includes(ideaId) || current.length >= MAX_BALLOT_SIZE) {
        return current;
      }

      return [...current, ideaId];
    });
  }

  function removeFromBallot(ideaId: string) {
    setSaveMessage('');
    setBallotIdeaIds((current) => current.filter((id) => id !== ideaId));
  }

  function moveBallotIdea(ideaId: string, direction: 'up' | 'down') {
    setSaveMessage('');
    setBallotIdeaIds((current) => {
      const index = current.indexOf(ideaId);
      if (index === -1) {
        return current;
      }

      const nextIndex = direction === 'up' ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  async function saveBallot(nextIdeaIds: string[]) {
    setIsSavingBallot(true);
    setSaveMessage('');

    try {
      const res = await fetch('/api/roadmap/ballot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ideaIds: nextIdeaIds,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save ballot');
      }

      setSaveMessage(nextIdeaIds.length > 0 ? 'Ranking ballot saved.' : 'Ranking ballot cleared.');
      await fetchIdeas();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save ballot');
    } finally {
      setIsSavingBallot(false);
    }
  }

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8 pb-3 border-b-2" style={{ borderColor: '#A51E30' }}>
        <div>
          <h1 className="text-2xl font-bold">Community Roadmap</h1>
          <p className="text-sm text-gray-500 mt-1">
            Trusted residents can submit ideas and rank approved priorities in order, forcing real tradeoffs instead of simple upvotes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isTrusted ? (
            <Link
              href="/roadmap/manage"
              className="px-4 py-2 bg-white text-gray-700 text-sm font-semibold rounded-full shadow-sm hover:shadow-md transition"
            >
              My Ideas
            </Link>
          ) : null}
          {isTrusted ? (
            <Link
              href="/roadmap/submit"
              className="px-4 py-2 text-white text-sm font-semibold rounded-full hover:opacity-90 transition"
              style={{ backgroundColor: '#A51E30' }}
            >
              + Submit Idea
            </Link>
          ) : null}
        </div>
      </div>

      {sessionStatus !== 'authenticated' ? (
        <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl px-4 py-3 text-sm">
          You can browse the public roadmap without signing in. Trusted membership is required to submit ideas and save a ranking ballot.
        </div>
      ) : null}

      {sessionStatus === 'authenticated' && !isTrusted ? (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 text-yellow-900 rounded-xl px-4 py-3 text-sm">
          Trusted membership is required to submit roadmap ideas or take part in ranking.
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Ranking Pool</p>
          <p className="text-3xl font-bold text-gray-900">{counts.APPROVED_FOR_RANKING ?? 0}</p>
          <p className="text-sm text-gray-500 mt-2">Approved ideas currently open for ballot ranking.</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Planned</p>
          <p className="text-3xl font-bold text-gray-900">{counts.PLANNED ?? 0}</p>
          <p className="text-sm text-gray-500 mt-2">Ideas staff intends to schedule after reviewing community priorities.</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">In Progress</p>
          <p className="text-3xl font-bold text-gray-900">{counts.IN_PROGRESS ?? 0}</p>
          <p className="text-sm text-gray-500 mt-2">Features actively being built in the current product cycle.</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">How Ranking Works</p>
          <p className="text-sm text-gray-700">
            Each trusted user saves one ordered top-five ballot. Higher placements are worth more, which produces a bounded community leaderboard.
          </p>
        </div>
      </div>

      {transparency ? (
        <div className="mb-8 bg-white rounded-xl shadow-sm border border-gray-200 p-5 text-sm text-gray-700">
          <p className="font-semibold text-gray-900 mb-2">Weighting Transparency</p>
          <p>
            Roadmap ranking is primarily community ballot-driven. Admins may apply small, roadmap-only multipliers between {transparency.multiplierRange.min}% and {transparency.multiplierRange.max}% for specific users when justified.
          </p>
          <p className="mt-2 text-gray-500">
            Current snapshot: {transparency.totalBallotCount} ballot{transparency.totalBallotCount === 1 ? '' : 's'} counted, with {transparency.weightedVoterCount} voter{transparency.weightedVoterCount === 1 ? '' : 's'} currently using a non-default roadmap weight.
          </p>
          <p className="mt-2 text-gray-500">
            Any non-default roadmap weight is limited to this roadmap domain and logged in admin history with a stated rationale.
          </p>
        </div>
      ) : null}

      {leaderboard.length > 0 ? (
        <div className="mb-8">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="text-xl font-bold text-gray-900">Current Community Priorities</h2>
            <p className="text-sm text-gray-500">Top ideas in the ranking pool right now.</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {leaderboard.slice(0, 3).map((entry) => {
              const idea = ideasById.get(entry.ideaId);
              if (!idea) {
                return null;
              }

              return (
                <Link
                  key={entry.ideaId}
                  href={`/roadmap/${idea.id}`}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition"
                >
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#A51E30] text-white font-bold">
                      #{entry.position}
                    </span>
                    <span className="text-sm text-gray-500">
                      {entry.score} pts
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{idea.title}</h3>
                  <p className="text-sm text-gray-700 mb-3">{idea.summary}</p>
                  <p className="text-xs uppercase tracking-wide text-gray-400">
                    {entry.ballotCount} ballot{entry.ballotCount === 1 ? '' : 's'} • avg rank {entry.averageRank} • raw {entry.rawScore} pts
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}

      {isTrusted && rankingIdeas.length > 0 ? (
        <div className="mb-8 bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-5">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Your Ranking Ballot</h2>
              <p className="text-sm text-gray-500 mt-1">
                Choose up to {MAX_BALLOT_SIZE} ideas and order them from highest priority to lowest priority.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => saveBallot(ballotIdeaIds)}
                disabled={isSavingBallot}
                className="px-4 py-2 text-white text-sm font-semibold rounded-full hover:opacity-90 transition disabled:opacity-50"
                style={{ backgroundColor: '#A51E30' }}
              >
                {isSavingBallot ? 'Saving...' : 'Save Ballot'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setBallotIdeaIds([]);
                  saveBallot([]);
                }}
                disabled={isSavingBallot || ballotIdeaIds.length === 0}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-full hover:bg-gray-200 transition disabled:opacity-50"
              >
                Clear
              </button>
            </div>
          </div>

          {saveMessage ? (
            <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-3 text-sm">
              {saveMessage}
            </div>
          ) : null}

          <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">Selected Priorities</p>
              {selectedBallotIdeas.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Your ballot is empty. Add ideas from the ranking pool to start.
                </p>
              ) : (
                <div className="space-y-3">
                  {selectedBallotIdeas.map((idea, index) => (
                    <div key={idea.id} className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Rank #{index + 1}</p>
                          <p className="font-semibold text-gray-900">{idea.title}</p>
                          <p className="text-sm text-gray-500 mt-1">{idea.summary}</p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => moveBallotIdea(idea.id, 'up')}
                            disabled={index === 0}
                            className="px-2 py-1 rounded border border-gray-300 text-xs text-gray-700 disabled:opacity-40"
                          >
                            Up
                          </button>
                          <button
                            type="button"
                            onClick={() => moveBallotIdea(idea.id, 'down')}
                            disabled={index === selectedBallotIdeas.length - 1}
                            className="px-2 py-1 rounded border border-gray-300 text-xs text-gray-700 disabled:opacity-40"
                          >
                            Down
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFromBallot(idea.id)}
                            className="px-2 py-1 rounded border border-rose-200 text-xs text-rose-700"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">Ranking Pool</p>
              <div className="space-y-3">
                {rankingIdeas.map((idea) => {
                  const inBallot = ballotIdeaIds.includes(idea.id);
                  const ballotFull = ballotIdeaIds.length >= MAX_BALLOT_SIZE;

                  return (
                    <div key={idea.id} className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[idea.status]}`}>
                              {STATUS_LABELS[idea.status]}
                            </span>
                            {idea.leaderboard ? (
                              <span className="text-xs uppercase tracking-wide text-gray-400">
                                #{idea.leaderboard.position} • {idea.leaderboard.score} weighted pts • {idea.leaderboard.rawScore} raw pts • {idea.leaderboard.ballotCount} ballots
                              </span>
                            ) : (
                              <span className="text-xs uppercase tracking-wide text-gray-400">
                                No ballots yet
                              </span>
                            )}
                          </div>
                          <h3 className="text-lg font-bold text-gray-900">{idea.title}</h3>
                          <p className="text-sm text-gray-700 mt-2">{idea.summary}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/roadmap/${idea.id}`}
                            className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-white transition"
                          >
                            View
                          </Link>
                          {inBallot ? (
                            <button
                              type="button"
                              onClick={() => removeFromBallot(idea.id)}
                              className="px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 transition"
                              style={{ backgroundColor: '#A51E30' }}
                            >
                              Remove
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => addToBallot(idea.id)}
                              disabled={ballotFull}
                              className="px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 transition disabled:opacity-50"
                              style={{ backgroundColor: '#46A8CC' }}
                            >
                              Add to Ballot
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5 mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
            placeholder="Search roadmap ideas"
          />
          <div className="flex flex-wrap gap-2">
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setSelectedStatus(value as RoadmapIdeaStatus | 'ALL')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  selectedStatus === value ? 'text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={selectedStatus === value ? { backgroundColor: '#46A8CC' } : {}}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
          Loading roadmap ideas...
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3">
          {error}
        </div>
      ) : filteredIdeas.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-2">No roadmap ideas match this view</h2>
          <p className="text-gray-500 max-w-md mx-auto mb-6">
            Approved community ideas will appear here after review. Trusted users can start the queue by submitting one.
          </p>
          {isTrusted ? (
            <Link
              href="/roadmap/submit"
              className="inline-block px-6 py-3 text-white font-semibold rounded-full hover:opacity-90 transition"
              style={{ backgroundColor: '#A51E30' }}
            >
              Submit an Idea
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredIdeas.map((idea) => (
            <Link
              key={idea.id}
              href={`/roadmap/${idea.id}`}
              className="block bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200 border-l-4"
              style={{ borderColor: '#A51E30' }}
            >
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[idea.status]}`}>
                  {STATUS_LABELS[idea.status]}
                </span>
                {idea.leaderboard ? (
                  <span className="text-xs uppercase tracking-wide text-gray-400">
                    #{idea.leaderboard.position} • {idea.leaderboard.score} weighted pts • {idea.leaderboard.rawScore} raw pts • {idea.leaderboard.ballotCount} ballots
                  </span>
                ) : (
                  <span className="text-xs uppercase tracking-wide text-gray-400">
                    {idea._count.ballotItems} saved ranking ballot{idea._count.ballotItems === 1 ? '' : 's'}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">{idea.title}</h2>
              <p className="text-gray-700 mb-3">{idea.summary}</p>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-500">
                <span>
                  Proposed by {idea.author.firstName} {idea.author.lastName}
                </span>
                <span>
                  {idea.status === 'SHIPPED' && idea.shippedAt
                    ? `Shipped ${new Date(idea.shippedAt).toLocaleDateString()}`
                    : idea.status === 'IN_PROGRESS' && idea.startedAt
                      ? `Started ${new Date(idea.startedAt).toLocaleDateString()}`
                      : idea.status === 'PLANNED' && idea.plannedAt
                        ? `Planned ${new Date(idea.plannedAt).toLocaleDateString()}`
                        : idea.publishedAt
                          ? `Opened ${new Date(idea.publishedAt).toLocaleDateString()}`
                          : `Submitted ${new Date(idea.createdAt).toLocaleDateString()}`}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
