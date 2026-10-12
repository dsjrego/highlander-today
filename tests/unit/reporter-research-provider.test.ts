import { beforeEach, afterEach, expect, jest, test } from '@jest/globals';
import type { ReporterSourcePacket } from '@/lib/reporter/types';
jest.mock('@/lib/reporter/agent-trace-service', () => ({ createSuccessfulReporterAgentTrace: jest.fn(), createFailedReporterAgentTrace: jest.fn() }));

const { assessReporterEvidence, discoverReporterEvidence } = require('@/lib/reporter/research-provider') as typeof import('@/lib/reporter/research-provider');

const originalFetch = global.fetch;
const originalKey = process.env.OPENAI_API_KEY;
const originalProvider = process.env.REPORTER_MODEL_PROVIDER;
const packet = (): ReporterSourcePacket => ({ runId: 'run', mode: 'RESEARCH', requestType: 'EDITOR_ASSIGNMENT', topic: 'Private assignment', title: 'Private title', subjectName: null, requestedArticleType: null, requestSummary: 'Confidential intake', editorNotes: 'Confidential editor notes', supportedClaims: [], sources: [
  { id: 'public', sourceType: 'NEWS_ARTICLE', title: 'Public news', url: 'https://example.com/story', publisher: null, author: null, publishedAt: null, retrievedAt: new Date().toISOString(), contentText: 'Published public story', excerpt: null, note: null, reliabilityTier: 'HIGH' },
  { id: 'private', sourceType: 'INTERVIEW_NOTE', title: 'Private interview', url: null, publisher: null, author: null, publishedAt: null, contentText: 'Confidential interview', excerpt: null, note: null, reliabilityTier: 'UNVERIFIED' },
] });
const respond = (result: unknown, sources: string[] = []) => new Response(JSON.stringify({ status: 'completed', output_text: JSON.stringify(result), output: [{ type: 'web_search_call', action: { sources: sources.map((url) => ({ type: 'url', url })) } }] }), { headers: { 'content-type': 'application/json' } });
beforeEach(() => { process.env.OPENAI_API_KEY = 'test-research-key'; process.env.REPORTER_MODEL_PROVIDER = 'openai'; global.fetch = jest.fn() as any; });
afterEach(() => {
  global.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey;
  if (originalProvider === undefined) delete process.env.REPORTER_MODEL_PROVIDER; else process.env.REPORTER_MODEL_PROVIDER = originalProvider;
});

test('requires bounded search at Luna/medium and only accepts consulted URLs', async () => {
  (global.fetch as any).mockResolvedValue(respond({ urls: ['https://agency.gov/report', 'https://invented.example/report'] }, ['https://agency.gov/report']));
  await expect(discoverReporterEvidence(packet(), AbortSignal.timeout(1000))).resolves.toEqual(['https://agency.gov/report']);
  const body = JSON.parse((global.fetch as any).mock.calls[0][1].body);
  expect(body).toMatchObject({ model: 'gpt-6-luna', reasoning: { effort: 'medium' }, tool_choice: 'required', max_tool_calls: 3, store: false });
  expect(body.input[1].content).not.toMatch(/Confidential|Private assignment|Private title/);
  expect(body.input[1].content).toContain('Published public story');
});

test('does not send private-only interview packets to search', async () => {
  const input = packet(); input.sources = input.sources.filter((source) => !source.url);
  await expect(discoverReporterEvidence(input, AbortSignal.timeout(1000))).resolves.toEqual([]);
  expect(global.fetch).not.toHaveBeenCalled();
});

test('assesses evidence without search tools and rejects incomplete provider results', async () => {
  (global.fetch as any).mockResolvedValueOnce(respond({ ready: false, summary: 'The packet has no primary count.', gaps: ['Retrieve the agency report.'], claims: [] }));
  const result = await assessReporterEvidence(packet(), AbortSignal.timeout(1000));
  expect(result.ready).toBe(false);
  expect(JSON.parse((global.fetch as any).mock.calls[0][1].body).tools).toBeUndefined();
  (global.fetch as any).mockResolvedValueOnce(new Response(JSON.stringify({ status: 'incomplete', output_text: '{}' })));
  await expect(assessReporterEvidence(packet(), AbortSignal.timeout(1000))).rejects.toThrow('incomplete');
});

test('fails closed when evidence assessment output is malformed', async () => {
  (global.fetch as any).mockResolvedValueOnce(respond({ ready: true }));
  await expect(assessReporterEvidence(packet(), AbortSignal.timeout(1000))).rejects.toThrow();
});
