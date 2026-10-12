import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import {
  REPORTER_MODEL_ROUTING_POLICY_VERSION,
  REPORTER_MODEL_TASK,
  inferReporterPacketRisk,
  resolveReporterModelRoute,
} from '@/lib/reporter/model-routing';
import type { ReporterSourcePacket } from '@/lib/reporter/types';

const ROUTING_ENVIRONMENT_KEYS = [
  'REPORTER_MODEL_NAME',
  'REPORTER_MODEL_REASONING_EFFORT',
  'REPORTER_MODEL_SOURCE_ANALYSIS',
  'REPORTER_MODEL_SOURCE_ANALYSIS_REASONING_EFFORT',
  'REPORTER_MODEL_ARTICLE_DRAFT',
  'REPORTER_MODEL_ARTICLE_DRAFT_REASONING_EFFORT',
  'REPORTER_MODEL_INTERVIEW',
  'REPORTER_MODEL_INTERVIEW_REASONING_EFFORT',
  'REPORTER_MODEL_FACT_EXTRACTION',
  'REPORTER_MODEL_FACT_EXTRACTION_REASONING_EFFORT',
  'REPORTER_MODEL_CLASSIFICATION',
  'REPORTER_MODEL_CLASSIFICATION_REASONING_EFFORT',
  'REPORTER_MODEL_FOLLOW_UPS',
  'REPORTER_MODEL_FOLLOW_UPS_REASONING_EFFORT',
  'REPORTER_MODEL_ESCALATION',
  'REPORTER_MODEL_ESCALATION_REASONING_EFFORT',
] as const;

const originalEnvironment = Object.fromEntries(
  ROUTING_ENVIRONMENT_KEYS.map((key) => [key, process.env[key]])
);

function buildPacket(
  overrides: Partial<ReporterSourcePacket> = {}
): ReporterSourcePacket {
  return {
    runId: 'run-1',
    mode: 'REQUEST',
    requestType: 'ARTICLE_REQUEST',
    topic: 'Bridge closure',
    title: 'Bridge closure',
    subjectName: null,
    requestedArticleType: null,
    requestSummary: null,
    editorNotes: null,
    supportedClaims: [
      {
        id: 'claim-1',
        claimType: 'OFFICIAL_STATEMENT',
        claimText: 'The bridge is closed.',
        sourceExcerpt: 'The bridge is closed.',
        attribution: 'County statement',
        confidence: 'HIGH',
        verificationStatus: 'SUPPORTED',
      },
    ],
    sources: [
      {
        id: 'source-1',
        sourceType: 'OFFICIAL_URL',
        title: 'County statement',
        url: 'https://example.com/one',
        publisher: 'County',
        author: null,
        publishedAt: null,
        excerpt: 'The bridge is closed.',
        note: null,
        contentText: null,
        reliabilityTier: 'PRIMARY',
      },
      {
        id: 'source-2',
        sourceType: 'STAFF_NOTE',
        title: 'Staff confirmation',
        url: null,
        publisher: 'Highlander Today',
        author: null,
        publishedAt: null,
        excerpt: 'Closure signs are in place.',
        note: null,
        contentText: null,
        reliabilityTier: 'HIGH',
      },
    ],
    ...overrides,
  };
}

describe('reporter model routing', () => {
  beforeEach(() => {
    for (const key of ROUTING_ENVIRONMENT_KEYS) delete process.env[key];
  });
  afterEach(() => {
    for (const key of ROUTING_ENVIRONMENT_KEYS) {
      const originalValue = originalEnvironment[key];
      if (originalValue === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalValue;
      }
    }
  });

  it('uses GPT-6 Luna medium for source analysis and article writing', () => {
    const packet = buildPacket();

    expect(
      resolveReporterModelRoute({
        task: REPORTER_MODEL_TASK.SOURCE_PACKET_ANALYSIS,
        packet,
      })
    ).toMatchObject({
      policyVersion: REPORTER_MODEL_ROUTING_POLICY_VERSION,
      model: 'gpt-6-luna',
      reasoningEffort: 'medium',
      riskLevel: 'routine',
      escalated: false,
    });
    expect(
      resolveReporterModelRoute({
        task: REPORTER_MODEL_TASK.ARTICLE_DRAFT,
        packet,
      })
    ).toMatchObject({
      model: 'gpt-6-luna',
      reasoningEffort: 'medium',
      riskLevel: 'routine',
    });
  });

  it('keeps thin source analysis on GPT-6 Luna medium', () => {
    const packet = buildPacket({ sources: buildPacket().sources.slice(0, 1) });

    expect(inferReporterPacketRisk(packet)).toBe('elevated');
    expect(
      resolveReporterModelRoute({
        task: REPORTER_MODEL_TASK.SOURCE_PACKET_ANALYSIS,
        packet,
      })
    ).toMatchObject({
      model: 'gpt-6-luna',
      reasoningEffort: 'medium',
      riskLevel: 'elevated',
      escalated: false,
    });
  });

  it('flags disputed evidence and retries while retaining Luna medium', () => {
    const disputedPacket = buildPacket({
      supportedClaims: [
        {
          ...buildPacket().supportedClaims[0],
          verificationStatus: 'DISPUTED',
        },
      ],
    });

    expect(
      resolveReporterModelRoute({
        task: REPORTER_MODEL_TASK.SOURCE_PACKET_ANALYSIS,
        packet: disputedPacket,
      })
    ).toMatchObject({
      model: 'gpt-6-luna',
      reasoningEffort: 'medium',
      riskLevel: 'high',
      escalated: true,
    });
    expect(
      resolveReporterModelRoute({
        task: REPORTER_MODEL_TASK.INTERVIEW_NEXT_STEP,
        attempt: 1,
      })
    ).toMatchObject({
      model: 'gpt-6-luna',
      reasoningEffort: 'medium',
      attempt: 1,
      escalated: true,
    });
  });

  it('uses Luna medium for extraction and classification task entries', () => {
    expect(
      resolveReporterModelRoute({
        task: REPORTER_MODEL_TASK.INTERVIEW_FACT_EXTRACTION,
      })
    ).toMatchObject({ model: 'gpt-6-luna', reasoningEffort: 'medium' });
    expect(
      resolveReporterModelRoute({
        task: REPORTER_MODEL_TASK.CLASSIFY_READINESS,
      })
    ).toMatchObject({ model: 'gpt-6-luna', reasoningEffort: 'medium' });
  });

  it('ignores stale global, task and escalation overrides for every task and risk/retry path', () => {
    for (const key of ROUTING_ENVIRONMENT_KEYS) {
      process.env[key] = key.endsWith('REASONING_EFFORT') ? 'high' : 'gpt-6.1-sol';
    }
    for (const task of Object.values(REPORTER_MODEL_TASK)) {
      for (const riskLevel of ['routine', 'elevated', 'high'] as const) {
        for (const attempt of [0, 1]) {
          expect(resolveReporterModelRoute({ task, riskLevel, attempt })).toMatchObject({
            model: 'gpt-6-luna', reasoningEffort: 'medium', riskLevel, attempt,
          });
        }
      }
    }
  });

  it('accepts only the exact approved model and medium reasoning', () => {
    process.env.REPORTER_MODEL_ARTICLE_DRAFT = 'gpt-6-luna-custom';
    process.env.REPORTER_MODEL_ARTICLE_DRAFT_REASONING_EFFORT = 'none';
    expect(resolveReporterModelRoute({ task: REPORTER_MODEL_TASK.ARTICLE_DRAFT }))
      .toMatchObject({ model: 'gpt-6-luna', reasoningEffort: 'medium' });
  });
});
