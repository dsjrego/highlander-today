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
  (assessReporterEvidence as any).mockResolvedValue({ ready: false, summary: 'Source body inaccessible.', headline: null, omittedClaims: [], gaps: [], claims: [] });
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

const wildfire = 'Improve wildfire planning, coordination, and recovery, including the use of virtual fencing;';
const nepa = 'Improve National Environmental Policy Act efficiencies; and';
function grazingAssessment(central = false): ReporterEvidenceAssessment {
  return { ...assessment(), claims: [...assessment().claims, { text: 'The directive lists wildfire planning and NEPA efficiencies.', central, status: 'attributed', attribution: 'USDA announcement', asOf: null,
    evidence: [{ sourceId: 'cdc', quote: `${wildfire} and\n\n${nepa.replace('; and', ';')}` }] }] };
}
function grazingSource() {
  (fetchReporterPublicDocument as any).mockImplementation(async (url: string) => ({ url, title: 'Public report', text: url.includes('cdc.gov') ? `${quote}\n\n${wildfire}\n\n${nepa}` : `News article cites agency report: ${quote}`, retrievedAt: new Date().toISOString(), links: url.includes('stateline') ? [{ url: 'https://www.cdc.gov/measles/report', label: 'CDC report' }] : [] }));
}

test('repairs joined action-list quotes with separate exact passages before drafting', async () => {
  grazingSource(); const corrected = grazingAssessment();
  corrected.claims[1].evidence = [{ sourceId: 'cdc', quote: wildfire }, { sourceId: 'cdc', quote: nepa }];
  (assessReporterEvidence as any).mockResolvedValueOnce(grazingAssessment()).mockResolvedValueOnce(corrected);
  const result = await prepareReporterResearch({ packet: packet(), communityId: 'tenant-1', createdByUserId: null });
  expect(assessReporterEvidence).toHaveBeenCalledTimes(2);
  expect(assessReporterEvidence).toHaveBeenLastCalledWith(expect.anything(), expect.any(AbortSignal), expect.objectContaining({ validationGaps: [expect.stringContaining('Supporting passage')] }));
  expect(result.supportedClaims).toHaveLength(2);
  expect(result.supportedClaims[1].sourceExcerpt).toContain(nepa);
  expect(result.researchNotes).not.toContain('Omitted');
});

test('omits an unrepairable incidental citation internally while retaining supported central facts', async () => {
  grazingSource(); (assessReporterEvidence as any).mockResolvedValue(grazingAssessment());
  const result = await prepareReporterResearch({ packet: packet(), communityId: 'tenant-1', createdByUserId: null });
  expect(assessReporterEvidence).toHaveBeenCalledTimes(2);
  expect(result.supportedClaims).toHaveLength(1);
  expect(result.researchNotes).toContain('Omitted unsupported claims: The directive lists wildfire');
  expect(result.editorNotes).not.toContain('Reporting gaps:');
});

test('keeps a central quotation failure blocking after one unsuccessful correction', async () => {
  grazingSource(); (assessReporterEvidence as any).mockResolvedValue(grazingAssessment(true));
  await expect(prepareReporterResearch({ packet: packet(), communityId: 'tenant-1', createdByUserId: null })).rejects.toThrow('Supporting passage');
  expect(assessReporterEvidence).toHaveBeenCalledTimes(2);
});

test('correction cannot erase or demote a failing central premise', async () => {
  grazingSource(); const demoted = grazingAssessment(false); demoted.claims[1].status = 'unresolved';
  (assessReporterEvidence as any).mockResolvedValueOnce(grazingAssessment(true)).mockResolvedValueOnce(demoted);
  await expect(prepareReporterResearch({ packet: packet(), communityId: 'tenant-1', createdByUserId: null })).rejects.toThrow('Unresolved central claim');
  (assessReporterEvidence as any).mockResolvedValueOnce(grazingAssessment(true)).mockResolvedValueOnce(assessment());
  await expect(prepareReporterResearch({ packet: packet(), communityId: 'tenant-1', createdByUserId: null })).rejects.toThrow('Supporting passage');
});

test('an unavailable correction never bypasses central grounding', async () => {
  grazingSource(); (assessReporterEvidence as any).mockResolvedValueOnce(grazingAssessment(true)).mockRejectedValueOnce(new Error('Provider timeout'));
  await expect(prepareReporterResearch({ packet: packet(), communityId: 'tenant-1', createdByUserId: null })).rejects.toThrow('Supporting passage');
});

test('does not reuse a cached assessment whose quotation fails validation', async () => {
  (db.reporterAgentTrace.findFirst as any).mockResolvedValue({ parsedOutputJson: grazingAssessment(true) });
  const result = await prepareReporterResearch({ packet: packet(), communityId: 'tenant-1', createdByUserId: null });
  expect(assessReporterEvidence).toHaveBeenCalledTimes(1);
  expect(result.supportedClaims).toHaveLength(1);
});

test('26 attached leads cannot crowd out the story or its discovered primary document', async () => {
  const input = packet(); input.sources = Array.from({ length: 25 }, (_, i) => ({ ...source(`unrelated-${i}`, `https://news.example/sports-betting-${i}`), title: 'Sports betting and gambling' }));
  input.sources.push(source('story', 'https://stateline.org/measles-cases'));
  (fetchReporterPublicDocument as any).mockImplementation(async (url: string) => ({ url, title: 'Report', text: url.includes('cdc.gov') ? quote : `News reports ${quote}`, links: [], retrievedAt: new Date().toISOString() }));
  (discoverReporterEvidence as any).mockResolvedValue(['https://www.cdc.gov/measles/report']);
  const result = await prepareReporterResearch({ packet: input, communityId: 'tenant-1', createdByUserId: null, forceRefresh: true });
  expect(fetchReporterPublicDocument).toHaveBeenCalledTimes(2);
  expect(result.sources.map((item) => item.id)).toEqual(['story', 'cdc']);
  expect(discoverReporterEvidence).toHaveBeenCalledWith(expect.objectContaining({ sources: [expect.objectContaining({ id: 'story' })] }), expect.any(AbortSignal));
});

test('reserves a final fetch for evidence follow-up within the eight-attempt total', async () => {
  const input = packet(); input.sources = [1, 2, 3].map(i => source(`story-${i}`, `https://news.example/measles-${i}`));
  (fetchReporterPublicDocument as any).mockImplementation(async (url: string) => ({ url, title: 'Report', text: `${url}: ${quote}`, retrievedAt: new Date().toISOString(), links: url.includes('news.example') ? [1, 2].map(i => ({ url: `https://agency.gov/measles-link-${i}`, label: 'Measles data' })) : [] }));
  (discoverReporterEvidence as any).mockResolvedValueOnce([1, 2, 3, 4].map(i => `https://agency.gov/measles-search-${i}`)).mockResolvedValueOnce(['https://agency.gov/measles-followup']);
  const incomplete = { ...assessment(), ready: false, gaps: ['Reporting period unresolved'], claims: [] };
  const supported = assessment(); supported.claims[0].evidence[0].sourceId = 'story-1';
  (assessReporterEvidence as any).mockResolvedValueOnce(incomplete).mockResolvedValueOnce(supported);
  await prepareReporterResearch({ packet: input, communityId: 'tenant-1', createdByUserId: null });
  expect(fetchReporterPublicDocument).toHaveBeenCalledTimes(8);
  expect(fetchReporterPublicDocument).toHaveBeenLastCalledWith('https://agency.gov/measles-followup', expect.any(AbortSignal));
});

test('retrieving an attached primary URL updates its existing source instead of adding a duplicate', async () => {
  const input = packet(); input.sources.push({ ...source('cdc', 'https://www.cdc.gov/measles/report'), title: 'Agency report' });
  await prepareReporterResearch({ packet: input, communityId: 'tenant-1', createdByUserId: null });
  expect(db.reporterSource.create).not.toHaveBeenCalled();
  expect(db.reporterSource.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: 'cdc' }) }));
});

test('records an incidental claim withdrawn by citation correction in internal omissions', async () => {
  grazingSource(); const withdrawn = grazingAssessment(); withdrawn.claims[1].status = 'unresolved'; withdrawn.claims[1].evidence = [];
  (assessReporterEvidence as any).mockResolvedValueOnce(grazingAssessment()).mockResolvedValueOnce(withdrawn);
  const result = await prepareReporterResearch({ packet: packet(), communityId: 'tenant-1', createdByUserId: null });
  expect(result.supportedClaims).toHaveLength(1);
  expect(result.researchNotes).toContain('citation correction could not establish support');
});
