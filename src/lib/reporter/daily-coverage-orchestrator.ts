import { evaluateReporterDailyCoverage } from './daily-coverage';
import { runDueReporterMonitoredSources } from './monitored-source-scheduler';
import { materializeReporterStoryCandidates } from './story-candidates';

const DEFAULT_SOURCE_FETCH_LIMIT = 10;
const DEFAULT_CANDIDATE_LIMIT = 12;
const DEFAULT_MORNING_DESK_LIMIT = 5;

export async function runReporterDailyCoverageOrchestrator(params: {
  communityId: string;
  date?: string;
  sourceFetchLimit?: number;
  candidateLimit?: number;
}) {
  const sourceFetch = await runDueReporterMonitoredSources({
    communityId: params.communityId,
    limit: params.sourceFetchLimit || DEFAULT_SOURCE_FETCH_LIMIT,
  });

  const candidateRefresh = await materializeReporterStoryCandidates({
    communityId: params.communityId,
    limit: params.candidateLimit || DEFAULT_CANDIDATE_LIMIT,
  });

  const dailyDesk = await evaluateReporterDailyCoverage({
    communityId: params.communityId,
    date: params.date,
    createdByUserId: null,
  });

  return {
    completedAt: new Date(),
    sourceFetch,
    candidateRefresh: {
      candidateCount: candidateRefresh.candidateCount,
      morningDesk: candidateRefresh.candidates
        .slice(0, DEFAULT_MORNING_DESK_LIMIT)
        .map((candidate) => ({
          id: candidate.id,
          title: candidate.title,
          candidateType: candidate.candidateType,
          score: candidate.signal.score,
          signalLevel: candidate.signal.level,
          readiness: candidate.readiness.level,
          readinessLabel: candidate.readiness.label,
          sourceCount: candidate.sourceCount,
          latestAt: candidate.latestAt,
          reasons: candidate.signal.reasons,
        })),
    },
    dailyDesk,
  };
}
