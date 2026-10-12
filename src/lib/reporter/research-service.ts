import { db } from '@/lib/db';
import { createSuccessfulReporterAgentTrace } from './agent-trace-service';
import { fetchReporterPublicDocument, normalizeReporterPublicUrl, type ReporterPublicDocument } from './public-document';
import { assessReporterEvidence, discoverReporterEvidence, ReporterEvidenceAssessmentSchema, type ReporterEvidenceAssessment } from './research-provider';
import { assertReporterAgentActionAllowed, REPORTER_AGENT_ACTION, REPORTER_AGENT_ACTOR } from './reporter-agent-permissions';
import type { ReporterSourcePacket, ReporterSourcePacketItem } from './types';
import { hashReporterJson } from './prompt-loader';
import { validatePublicHttpUrl } from '@/lib/security/safe-fetch';
import { REPORTER_PUBLIC_SOURCE_TYPES as PUBLIC_SOURCE_TYPES, reporterStoryRelevance, selectReporterResearchSeeds } from './research-source-selection';

const MAX_DOCUMENTS = 8;
const CACHE_MS = 60 * 60 * 1000;

export class ReporterNeedsReportingError extends Error {
  constructor(message: string) { super(message); this.name = 'ReporterNeedsReportingError'; }
}

function normalizedText(value: string) { return value.replace(/\s+/g, ' ').trim(); }

function assessmentPacketHash(packet: ReporterSourcePacket) {
  return hashReporterJson({ policy: 'research-evidence-v4', topic: packet.topic, title: packet.title, sources: packet.sources,
    disputedClaims: packet.supportedClaims.filter((claim) => ['DISPUTED', 'REJECTED'].includes(claim.verificationStatus)) });
}

function claimEvidenceGaps(claim: ReporterEvidenceAssessment['claims'][number], packet: ReporterSourcePacket): string[] {
  const gaps: string[] = [];
  if (!['supported', 'attributed'].includes(claim.status)) return gaps;
  if (claim.status === 'attributed' && !claim.attribution?.trim()) gaps.push(`Missing attribution: ${claim.text}`);
  if (!claim.evidence.length) gaps.push(`No evidence recorded for: ${claim.text}`);
  for (const evidence of claim.evidence) {
    const source = packet.sources.find((candidate) => candidate.id === evidence.sourceId);
    if (!source?.contentText || !normalizedText(source.contentText).includes(normalizedText(evidence.quote))) {
      gaps.push(`Supporting passage was not found in the retrieved source for: ${claim.text}`);
    }
  }
  return gaps;
}

/** Quote existence is a grounding check; semantic support is assessed separately. */
export function validateReporterEvidence(assessment: ReporterEvidenceAssessment, packet: ReporterSourcePacket): string[] {
  const gaps = [...assessment.gaps];
  const central = assessment.claims.filter((claim) => claim.central);
  if (!assessment.ready) gaps.push(assessment.summary);
  if (!central.length) gaps.push('Research did not identify a supported central claim.');
  for (const claim of assessment.claims) {
    if (claim.central && ['unresolved', 'disputed'].includes(claim.status)) gaps.push(`Unresolved central claim: ${claim.text}`);
    gaps.push(...claimEvidenceGaps(claim, packet));
  }
  return [...new Set(gaps)];
}

export async function prepareReporterResearch(params: {
  packet: ReporterSourcePacket;
  communityId: string;
  createdByUserId: string | null;
  requireReady?: boolean;
  forceRefresh?: boolean;
}): Promise<ReporterSourcePacket> {
  const { packet } = params;
  const owner = await db.reporterRun.findFirst({ where: { id: packet.runId, communityId: params.communityId, status: { not: 'ARCHIVED' } }, select: { id: true } });
  if (!owner) throw new ReporterNeedsReportingError('Reporter run is unavailable in this community or is archived.');
  await assertReporterAgentActionAllowed({ actor: REPORTER_AGENT_ACTOR.RESEARCH_AGENT, action: REPORTER_AGENT_ACTION.RETRIEVE_PUBLIC_EVIDENCE, reporterRunId: packet.runId });
  const signal = AbortSignal.timeout(150000);
  const sources: ReporterSourcePacketItem[] = [];
  const visited = new Set<string>();
  const documents: ReporterPublicDocument[] = [];
  const failures: Array<{ url: string; reason: string }> = [];
  const seeds = selectReporterResearchSeeds(packet);
  let attempts = 0;

  const retrieve = async (url: string, existing?: ReporterSourcePacketItem) => {
    const normalized = normalizeReporterPublicUrl(url);
    if (!normalized || visited.has(normalized) || attempts >= MAX_DOCUMENTS || signal.aborted) return;
    visited.add(normalized);
    attempts += 1;
    existing ||= packet.sources.find((source) => source.url && normalizeReporterPublicUrl(source.url) === normalized);
    try {
      const document = await fetchReporterPublicDocument(normalized, signal);
      if (documents.some((existingDocument) => normalizedText(existingDocument.text) === normalizedText(document.text))) {
        visited.add(normalizeReporterPublicUrl(document.url) || normalized);
        return;
      }
      const metadata = {
        contentText: document.text, retrievedAt: new Date(document.retrievedAt),
        ...(!existing?.title || existing.title === existing.url ? { title: document.title } : {}),
      };
      let source: ReporterSourcePacketItem;
      if (existing) {
        const updated = await db.reporterSource.updateMany({ where: { id: existing.id, reporterRunId: packet.runId, reporterRun: { communityId: params.communityId } }, data: metadata });
        if (updated.count !== 1) throw new Error('Source ownership changed during retrieval.');
        source = { ...existing, ...metadata, url: normalized, retrievedAt: document.retrievedAt };
      } else {
        const created = await db.reporterSource.create({ data: {
          reporterRunId: packet.runId, sourceType: 'DOCUMENT', url: normalized,
          title: document.title, publisher: new URL(document.url).hostname,
          contentText: document.text, retrievedAt: new Date(document.retrievedAt),
          // A successful fetch does not certify reliability or factual accuracy.
          reliabilityTier: 'UNVERIFIED', sortOrder: packet.sources.length + sources.length,
          note: 'Retrieved automatically as public reporting evidence.', createdByUserId: params.createdByUserId,
        } });
        source = { id: created.id, sourceType: 'DOCUMENT', title: document.title, url: normalized, publisher: new URL(document.url).hostname,
          author: null, publishedAt: null, excerpt: null, note: created.note, contentText: document.text, reliabilityTier: 'UNVERIFIED', retrievedAt: document.retrievedAt };
      }
      sources.push(source);
      documents.push(document);
      visited.add(normalizeReporterPublicUrl(document.url) || normalized);
    } catch (error) {
      failures.push({ url: normalized, reason: error instanceof Error ? error.message : 'Public source retrieval failed.' });
      if (existing) sources.push({ ...existing, contentText: null, excerpt: null });
    }
  };

  sources.push(...packet.sources.filter((source) => !source.url || !PUBLIC_SOURCE_TYPES.has(source.sourceType)));
  for (const source of seeds) {
    const url = normalizeReporterPublicUrl(source.url!);
    if (!url || visited.has(url)) continue;
    if (!params.forceRefresh && source.retrievedAt && Date.now() - Date.parse(source.retrievedAt) < CACHE_MS && source.contentText) {
      visited.add(url); sources.push(source); continue;
    }
    await retrieve(url, source);
  }

  // Follow citations from article bodies, prioritizing public agencies and topic
  // matches. This is one bounded hop, never a recursive crawler.
  const links = documents.flatMap((document) => document.links).filter((link) => !visited.has(link.url));
  links.sort((left, right) => {
    const score = (link: typeof left) => (/\.gov\b|\.edu\b/.test(new URL(link.url).hostname) ? 10 : 0) +
      reporterStoryRelevance(packet, link.label, link.url);
    return score(right) - score(left);
  });
  for (const link of links.slice(0, 2)) await retrieve(link.url);

  let workingPacket = { ...packet, sources };
  const previousTrace = params.forceRefresh ? null : await db.reporterAgentTrace.findFirst({ where: { reporterRunId: packet.runId, provider: 'research-workflow', inputHash: assessmentPacketHash(workingPacket),
    wasSuccessful: true, createdAt: { gte: new Date(Date.now() - CACHE_MS) } }, orderBy: { createdAt: 'desc' } });
  const previousAssessment = ReporterEvidenceAssessmentSchema.safeParse(previousTrace?.parsedOutputJson);
  const reuseReadyAssessment = previousAssessment.success && validateReporterEvidence(previousAssessment.data, workingPacket).length === 0;
  const publicSearchSources: ReporterSourcePacketItem[] = [];
  for (const source of sources.filter((candidate) => PUBLIC_SOURCE_TYPES.has(candidate.sourceType) && candidate.url).slice(0, MAX_DOCUMENTS)) {
    try {
      await validatePublicHttpUrl(source.url!);
      const document = documents.find((candidate) => candidate.text === source.contentText);
      publicSearchSources.push({ ...source, title: document?.title || null, contentText: document?.text || null, excerpt: null, note: null });
    } catch { /* Internal or credential-bearing URLs must not reach search. */ }
  }
  if (publicSearchSources.length && !reuseReadyAssessment) {
    await assertReporterAgentActionAllowed({ actor: REPORTER_AGENT_ACTOR.RESEARCH_AGENT, action: REPORTER_AGENT_ACTION.SEARCH_PUBLIC_EVIDENCE, reporterRunId: packet.runId });
    try {
      const publicPacket = { ...workingPacket, sources: publicSearchSources };
      const urls = await discoverReporterEvidence(publicPacket, signal);
      urls.sort((left, right) => reporterStoryRelevance(packet, null, right) - reporterStoryRelevance(packet, null, left));
      // Leave one attempt for a different source if assessment finds a gap.
      for (const url of urls) {
        if (attempts >= MAX_DOCUMENTS - 1) break;
        await retrieve(url);
      }
    } catch (error) {
      failures.push({ url: 'public-search', reason: error instanceof Error ? error.message : 'Search unavailable.' });
    }
  }
  workingPacket = { ...packet, sources };
  let assessmentHash = assessmentPacketHash(workingPacket);
  let assessment: ReporterEvidenceAssessment;
  try {
    const cached = params.forceRefresh ? null : await db.reporterAgentTrace.findFirst({ where: { reporterRunId: packet.runId, provider: 'research-workflow', inputHash: assessmentHash,
      wasSuccessful: true, createdAt: { gte: new Date(Date.now() - CACHE_MS) } }, orderBy: { createdAt: 'desc' } });
    const cachedResult = ReporterEvidenceAssessmentSchema.safeParse(cached?.parsedOutputJson);
    assessment = cachedResult.success && validateReporterEvidence(cachedResult.data, workingPacket).length === 0
      ? cachedResult.data : await assessReporterEvidence(workingPacket, signal);
  } catch {
    await db.reporterRun.updateMany({ where: { id: packet.runId, communityId: params.communityId, status: { not: 'ARCHIVED' } }, data: { status: 'BLOCKED' } });
    throw new ReporterNeedsReportingError('Research could not complete its evidence check. Retry reporting before preparing an article.');
  }
  let gaps = validateReporterEvidence(assessment, workingPacket);
  if (gaps.length && publicSearchSources.length && attempts < MAX_DOCUMENTS && !signal.aborted) {
    // Only category labels derived from the assessment reach public search;
    // private interview/intake text can never become a follow-up query.
    const missingEvidence = [
      gaps.some((gap) => /histor|decade|highest|record|compar/i.test(gap)) ? 'historical comparison or annual time series' : null,
      gaps.some((gap) => /date|period|year|time/i.test(gap)) ? 'reporting period and as-of date' : null,
      'primary evidence for the public story’s unresolved central facts',
    ].filter((value): value is string => Boolean(value));
    try {
      const followUpPacket = { ...workingPacket, sources: [...publicSearchSources, ...sources.filter((source) => documents.some((document) => document.text === source.contentText))] };
      const urls = await discoverReporterEvidence(followUpPacket, signal, { missingEvidence, excludedUrls: [...visited] });
      const sourceCount = sources.length;
      for (const url of urls) await retrieve(url);
      if (sources.length > sourceCount) {
        workingPacket = { ...packet, sources };
        assessment = await assessReporterEvidence(workingPacket, signal);
        gaps = validateReporterEvidence(assessment, workingPacket);
      }
    } catch (error) {
      failures.push({ url: 'public-search-follow-up', reason: error instanceof Error ? error.message : 'Follow-up research unavailable.' });
    }
  }
  let citationRepairAttempted = false;
  const omittedInvalidClaims: string[] = [];
  if (assessment.claims.some((claim) => claimEvidenceGaps(claim, workingPacket).length) && !signal.aborted) {
    citationRepairAttempted = true;
    try {
      const corrected = await assessReporterEvidence(workingPacket, signal, { previousAssessment: assessment, validationGaps: gaps });
      assessment = { ...assessment, claims: assessment.claims.map((claim) => {
        if (!claimEvidenceGaps(claim, workingPacket).length) return claim;
        const replacement = corrected.claims.find((candidate) => candidate.text === claim.text);
        if (!claim.central && replacement && ['unresolved', 'disputed'].includes(replacement.status)) {
          omittedInvalidClaims.push(`${claim.text} (Omitted: citation correction could not establish support.)`);
        }
        // Correction can repair evidence or withdraw support, never erase/change
        // a central premise or promote another claim to replace it.
        return replacement ? { ...claim, evidence: replacement.evidence, attribution: replacement.attribution, status: replacement.status } : claim;
      }) };
      gaps = validateReporterEvidence(assessment, workingPacket);
    } catch (error) {
      failures.push({ url: 'evidence-correction', reason: error instanceof Error ? error.message : 'Evidence correction unavailable.' });
    }
  }
  // A malformed incidental citation must never enter copy or prevent an otherwise
  // supported brief. Essential claims and explicit reporting obstacles still block.
  assessment = { ...assessment, claims: assessment.claims.map((claim) => {
    const issues = claimEvidenceGaps(claim, workingPacket);
    if (claim.central || !issues.length) return claim;
    omittedInvalidClaims.push(`${claim.text} (Omitted: ${issues.join(' ')})`);
    return { ...claim, status: 'unresolved' as const, evidence: [] };
  }), omittedClaims: [...assessment.omittedClaims] };
  assessment.omittedClaims.push(...omittedInvalidClaims);
  gaps = validateReporterEvidence(assessment, workingPacket);
  assessmentHash = assessmentPacketHash(workingPacket);
  await createSuccessfulReporterAgentTrace({ reporterRunId: packet.runId, traceType: 'SOURCE_PACKET_ANALYSIS', provider: 'research-workflow',
    inputHash: assessmentHash, parsedOutputJson: assessment, validationJson: { ready: gaps.length === 0, gaps, failures, documentAttempts: attempts,
      citationRepairAttempted, omittedInvalidClaims, selectedSeedIds: seeds.map((source) => source.id),
      excludedPublicSourceCount: packet.sources.filter((source) => source.url && PUBLIC_SOURCE_TYPES.has(source.sourceType)).length - seeds.length },
    inputSnapshotJson: { sources: sources.map((source) => ({ id: source.id, url: source.url, retrievedAt: source.retrievedAt })) } });
  if (gaps.length && params.requireReady !== false) {
    await db.reporterRun.updateMany({ where: { id: packet.runId, communityId: params.communityId, status: { not: 'ARCHIVED' } }, data: { status: 'BLOCKED' } });
    throw new ReporterNeedsReportingError(`Reporting is incomplete: ${gaps.slice(0, 3).join(' ')}`);
  }

  // Only assessed claims guide writing. Legacy headline-derived "supported"
  // seeds remain auditable in the database but are not promoted into this packet.
  const researchNotes = [assessment.summary, assessment.omittedClaims.length ? `Omitted unsupported claims: ${assessment.omittedClaims.join(' ')}` : null].filter(Boolean).join('\n');
  return { ...workingPacket, title: assessment.headline || workingPacket.title, researchNotes,
    editorNotes: [packet.editorNotes, `Research assessment: ${researchNotes}`, gaps.length ? `Reporting gaps: ${gaps.join(' ')}` : null].filter(Boolean).join('\n'),
    supportedClaims: assessment.claims.filter((claim) => ['supported', 'attributed'].includes(claim.status)).map((claim, index) => ({
      id: `research-${index}`, claimType: claim.status === 'attributed' ? 'ATTRIBUTED_CLAIM' : 'BACKGROUND_CONTEXT',
      claimText: [claim.text, claim.asOf ? `As of: ${claim.asOf}.` : null].filter(Boolean).join(' '),
      sourceExcerpt: claim.evidence.map((evidence) => `[${evidence.sourceId}] ${evidence.quote}`).join('\n'),
      attribution: claim.attribution, confidence: 'MEDIUM', verificationStatus: 'SUPPORTED',
    })) };
}
