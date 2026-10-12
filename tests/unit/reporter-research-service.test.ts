import { jest, test, expect, beforeEach } from '@jest/globals';
import type { ReporterSourcePacket } from '@/lib/reporter/types';
import type { ReporterEvidenceAssessment } from '@/lib/reporter/research-provider';

jest.mock('@/lib/db', () => ({ db: { reporterSource: { updateMany: jest.fn(), create: jest.fn() }, reporterRun: { findFirst: jest.fn(), updateMany: jest.fn() }, reporterAgentTrace: { findFirst: jest.fn() } } }));
jest.mock('@/lib/reporter/reporter-agent-permissions', () => ({ ...jest.requireActual<typeof import('@/lib/reporter/reporter-agent-permissions')>('@/lib/reporter/reporter-agent-permissions'), assertReporterAgentActionAllowed: jest.fn() }));
jest.mock('@/lib/reporter/agent-trace-service', () => ({ createSuccessfulReporterAgentTrace: jest.fn(), createFailedReporterAgentTrace: jest.fn() }));
jest.mock('@/lib/reporter/research-provider', () => ({ ...jest.requireActual<typeof import('@/lib/reporter/research-provider')>('@/lib/reporter/research-provider'), assessReporterEvidence: jest.fn(), discoverReporterEvidence: jest.fn() }));
jest.mock('@/lib/reporter/public-document', () => ({ ...jest.requireActual<typeof import('@/lib/reporter/public-document')>('@/lib/reporter/public-document'), fetchReporterPublicDocument: jest.fn() }));
jest.mock('@/lib/security/safe-fetch', () => ({ validatePublicHttpUrl: jest.fn(async (value: string) => new URL(value)) }));

const { prepareReporterResearch, validateReporterEvidence } = require('@/lib/reporter/research-service') as typeof import('@/lib/reporter/research-service');
const { assessReporterEvidence, discoverReporterEvidence } = require('@/lib/reporter/research-provider') as typeof import('@/lib/reporter/research-provider');
const { fetchReporterPublicDocument } = require('@/lib/reporter/public-document') as typeof import('@/lib/reporter/public-document');
const { db } = require('@/lib/db') as typeof import('@/lib/db');

const quote = 'As of October 8, 2026, 4,080 confirmed measles cases were reported in the United States in 2026.';
const source = (id: string, url: string) => ({ id, url, sourceType: 'NEWS_ARTICLE' as const, title: 'Measles cases', publisher: 'Stateline', author: null, publishedAt: null, excerpt: null, note: null, contentText: null, reliabilityTier: 'HIGH' as const });
const packet = (): ReporterSourcePacket => ({ runId: 'run-1', mode: 'RESEARCH', requestType: 'EDITOR_ASSIGNMENT', topic: 'Measles cases', title: 'Measles cases', subjectName: null, requestedArticleType: null, requestSummary: null, editorNotes: 'Private editor note', supportedClaims: [], sources: [source('story', 'https://stateline.org/story'), source('duplicate', 'https://stateline.org/story#duplicate')] });
const assessment = (): ReporterEvidenceAssessment => ({ ready: true, summary: 'CDC confirms the dated U.S. count.', headline: null, omittedClaims: [], gaps: [], claims: [{ text: '4,080 U.S. cases as of October 8, 2026', central: true, status: 'supported', attribution: 'CDC', asOf: 'October 8, 2026', evidence: [{ sourceId: 'cdc', quote }] }] });

beforeEach(() => {
  jest.clearAllMocks();
  (db.reporterSource.updateMany as any).mockResolvedValue({ count: 1 });
  (db.reporterSource.create as any).mockResolvedValue({ id: 'cdc', note: 'Retrieved automatically as public reporting evidence.' });
  (db.reporterRun.updateMany as any).mockResolvedValue({ count: 1 });
  (db.reporterRun.findFirst as any).mockResolvedValue({ id: 'run-1' });
  (db.reporterAgentTrace.findFirst as any).mockResolvedValue(null);
  (discoverReporterEvidence as any).mockResolvedValue([]);
  (assessReporterEvidence as any).mockResolvedValue(assessment());
  (fetchReporterPublicDocument as any).mockImplementation(async (url: string) => ({ url, title: 'Public report', text: url.includes('cdc.gov') ? quote : `Stateline cites the CDC report. ${quote}`, retrievedAt: new Date().toISOString(), links: url.includes('stateline') ? [{ url: 'https://www.cdc.gov/measles/report', label: 'CDC report' }] : [] }));
});

test('retrieves a bare story URL once and follows its primary evidence before assessment', async () => {
  const result = await prepareReporterResearch({ packet: packet(), communityId: 'tenant-1', createdByUserId: 'editor' });
  expect(fetchReporterPublicDocument).toHaveBeenCalledTimes(2);
  expect(assessReporterEvidence).toHaveBeenCalledWith(expect.objectContaining({ sources: expect.arrayContaining([expect.objectContaining({ id: 'cdc', contentText: quote })]) }), expect.any(AbortSignal));
  expect(db.reporterSource.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'story', reporterRunId: 'run-1', reporterRun: { communityId: 'tenant-1' } } }));
  expect(result.supportedClaims[0].claimText).toContain('October 8, 2026');
  expect(result.sources).toHaveLength(2);
});

test('retrieves search discoveries before checking their evidence', async () => {
  (fetchReporterPublicDocument as any).mockResolvedValueOnce({ url: 'https://stateline.org/story', text: `The newspaper reports these figures. ${quote}`, links: [], title: 'Story', retrievedAt: new Date().toISOString() });
  (discoverReporterEvidence as any).mockResolvedValue(['https://www.cdc.gov/measles/report']);
  await prepareReporterResearch({ packet: packet(), communityId: 'tenant-1', createdByUserId: null });
  expect(fetchReporterPublicDocument).toHaveBeenCalledWith('https://www.cdc.gov/measles/report', expect.any(AbortSignal));
});

test('blocks unsupported central claims instead of writing a disclaimer story', async () => {
  const result = assessment(); result.claims[0].status = 'unresolved'; result.ready = false;
  (assessReporterEvidence as any).mockResolvedValue(result);
  await expect(prepareReporterResearch({ packet: packet(), communityId: 'tenant-1', createdByUserId: null })).rejects.toThrow('Reporting is incomplete');
  expect(db.reporterRun.updateMany).toHaveBeenCalledWith({ where: { id: 'run-1', communityId: 'tenant-1', status: { not: 'ARCHIVED' } }, data: { status: 'BLOCKED' } });
});

test('rejects invented evidence passages even when a model labels the story ready', () => {
  const result = assessment(); result.claims[0].evidence[0].quote = 'An invented passage that does not exist in the source';
  expect(validateReporterEvidence(result, { ...packet(), sources: [{ ...source('cdc', 'https://www.cdc.gov/report'), contentText: quote }] })).toEqual(expect.arrayContaining([expect.stringContaining('not found')]));
});

test('keeps unresolved research available for internal analysis without allowing an article', async () => {
  const result = assessment(); result.ready = false; result.claims[0].status = 'disputed'; result.gaps = ['The CDC and state reporting dates differ.'];
  (assessReporterEvidence as any).mockResolvedValue(result);
  const researched = await prepareReporterResearch({ packet: packet(), communityId: 'tenant-1', createdByUserId: null, requireReady: false });
  expect(researched.editorNotes).toContain('reporting dates differ');
  expect(researched.supportedClaims).toHaveLength(0);
});

test('a failed fetch cannot promote a feed excerpt into retrieved evidence', async () => {
  (fetchReporterPublicDocument as any).mockRejectedValue(new Error('HTTP 403'));
  (assessReporterEvidence as any).mockResolvedValue({ ready: false, summary: 'Source body inaccessible.', gaps: [], claims: [] });
  const input = packet(); input.sources[0].contentText = 'A headline-only feed excerpt';
  await expect(prepareReporterResearch({ packet: input, communityId: 'tenant-1', createdByUserId: null })).rejects.toThrow('incomplete');
  expect(assessReporterEvidence).toHaveBeenCalledWith(expect.objectContaining({ sources: [expect.objectContaining({ contentText: null, excerpt: null })] }), expect.any(AbortSignal));
});

test('rejects a tenant mismatch before retrieving or saving evidence', async () => {
  (db.reporterRun.findFirst as any).mockResolvedValue(null);
  await expect(prepareReporterResearch({ packet: packet(), communityId: 'wrong-tenant', createdByUserId: null })).rejects.toThrow('unavailable');
  expect(fetchReporterPublicDocument).not.toHaveBeenCalled();
  expect(db.reporterSource.create).not.toHaveBeenCalled();
});

test('tries a different evidence source when the first assessment finds a central gap', async () => {
  const incomplete = assessment(); incomplete.ready = false; incomplete.gaps = ['Historical comparison is unverified.'];
  (assessReporterEvidence as any).mockResolvedValueOnce(incomplete).mockResolvedValueOnce(assessment());
  (discoverReporterEvidence as any).mockResolvedValueOnce([]).mockResolvedValueOnce(['https://agency.gov/history']);
  (fetchReporterPublicDocument as any).mockImplementation(async (url: string) => ({ url, title: 'Public report', text: `${url}: ${quote}`, retrievedAt: new Date().toISOString(), links: url.includes('stateline') ? [{ url: 'https://www.cdc.gov/measles/report', label: 'report' }] : [] }));
  const result = await prepareReporterResearch({ packet: packet(), communityId: 'tenant-1', createdByUserId: null });
  expect(assessReporterEvidence).toHaveBeenCalledTimes(2);
  expect(discoverReporterEvidence).toHaveBeenLastCalledWith(expect.anything(), expect.any(AbortSignal), expect.objectContaining({ missingEvidence: expect.arrayContaining(['historical comparison or annual time series']), excludedUrls: expect.arrayContaining(['https://stateline.org/story']) }));
  expect(result.sources.some((item) => item.url === 'https://agency.gov/history')).toBe(true);
});

test('narrows a supported brief and keeps an unsupported comparison in internal notes', async () => {
  (assessReporterEvidence as any).mockResolvedValue({ ...assessment(), headline: 'CDC reports 4,080 measles cases as of October 8', omittedClaims: ['Highest in decades: no comparable historical series retrieved.'] });
  const result = await prepareReporterResearch({ packet: packet(), communityId: 'tenant-1', createdByUserId: null });
  expect(result.title).toBe('CDC reports 4,080 measles cases as of October 8');
  expect(result.researchNotes).toContain('Omitted unsupported claims: Highest in decades');
  expect(result.supportedClaims.every((claim) => !claim.claimText.includes('decades'))).toBe(true);
});

test('an explicit re-run retrieves evidence and reassesses it despite recent cached reporting', async () => {
  const input = packet();
  input.sources = [{ ...source('cdc', 'https://www.cdc.gov/measles/report'), contentText: 'An older cached agency statement.', retrievedAt: new Date().toISOString() }];
  (db.reporterAgentTrace.findFirst as any).mockResolvedValue({ parsedOutputJson: assessment() });
  const result = await prepareReporterResearch({ packet: input, communityId: 'tenant-1', createdByUserId: 'editor', forceRefresh: true });
  expect(fetchReporterPublicDocument).toHaveBeenCalledWith('https://www.cdc.gov/measles/report', expect.any(AbortSignal));
  expect(discoverReporterEvidence).toHaveBeenCalled();
  expect(assessReporterEvidence).toHaveBeenCalledWith(expect.objectContaining({ sources: [expect.objectContaining({ contentText: quote })] }), expect.any(AbortSignal));
  expect(result.sources[0].contentText).toBe(quote);
});
