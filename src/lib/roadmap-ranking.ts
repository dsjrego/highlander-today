export const MAX_ROADMAP_BALLOT_SIZE = 5;

export interface RoadmapRankingRecord {
  ideaId: string;
  rank: number;
  multiplierPercent?: number;
}

export interface RoadmapLeaderboardEntry {
  ideaId: string;
  score: number;
  ballotCount: number;
  averageRank: number;
  position: number;
}

export function getRoadmapPointsForRank(rank: number) {
  return Math.max(MAX_ROADMAP_BALLOT_SIZE - rank + 1, 0);
}

export function buildRoadmapLeaderboard(items: RoadmapRankingRecord[]) {
  const aggregates = new Map<
    string,
    {
      score: number;
      rawScore: number;
      ballotCount: number;
      totalRank: number;
    }
  >();

  for (const item of items) {
    const current = aggregates.get(item.ideaId) ?? {
      score: 0,
      rawScore: 0,
      ballotCount: 0,
      totalRank: 0,
    };

    const rawPoints = getRoadmapPointsForRank(item.rank);
    const multiplierPercent = item.multiplierPercent ?? 100;

    current.rawScore += rawPoints;
    current.score += Number(((rawPoints * multiplierPercent) / 100).toFixed(2));
    current.ballotCount += 1;
    current.totalRank += item.rank;
    aggregates.set(item.ideaId, current);
  }

  return Array.from(aggregates.entries())
    .map(([ideaId, aggregate]) => ({
      ideaId,
      score: Number(aggregate.score.toFixed(2)),
      rawScore: aggregate.rawScore,
      ballotCount: aggregate.ballotCount,
      averageRank: Number((aggregate.totalRank / aggregate.ballotCount).toFixed(2)),
      position: 0,
    }))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      if (b.ballotCount !== a.ballotCount) {
        return b.ballotCount - a.ballotCount;
      }

      return a.averageRank - b.averageRank;
    })
    .map((entry, index) => ({
      ...entry,
      position: index + 1,
    }));
}
