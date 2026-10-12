import { test, expect } from '@jest/globals';
import { selectReporterResearchSeeds } from '@/lib/reporter/research-source-selection';
import type { ReporterSourcePacket, ReporterSourcePacketItem } from '@/lib/reporter/types';
const source = (id: string, title: string, sourceType: ReporterSourcePacketItem['sourceType'] = 'NEWS_ARTICLE'): ReporterSourcePacketItem => ({ id, title, sourceType, url: `https://news.example/${id}`, publisher: null, author: null, publishedAt: null, contentText: null, excerpt: null, note: null, reliabilityTier: 'UNVERIFIED' });
const packet = (sources: ReporterSourcePacketItem[]): ReporterSourcePacket => ({ runId: 'run', mode: 'RESEARCH', requestType: 'EDITOR_ASSIGNMENT', topic: 'Rollins urges federal land ranchers to put June grazing directive to work', title: null, subjectName: null, requestedArticleType: null, requestSummary: null, editorNotes: null, supportedClaims: [], sources });

test('selects the relevant grazing lead regardless of attachment order', () => {
  const input = packet([source('sports', 'Sports betting'), source('rollins', 'Rollins urges ranchers to use grazing directive'), source('swine', 'Woman farmer swine reproduction specialist')]);
  expect(selectReporterResearchSeeds(input).map(s => s.id)).toEqual(['rollins']);
  expect(input.sources.map(s => s.id)).toEqual(['sports', 'rollins', 'swine']);
});
test('reserves budget even when more than eight attached articles match', () => {
  expect(selectReporterResearchSeeds(packet(Array.from({ length: 26 }, (_, i) => source(`article-${i}`, 'Rollins grazing directive'))))).toHaveLength(3);
});
test('generic assignments use one lead and never promote private notes to public search seeds', () => {
  const input = packet([source('private', 'Rollins grazing directive', 'INTERVIEW_NOTE'), source('first', 'County meeting'), source('second', 'School budget')]);
  input.title = input.topic = 'Research assignment';
  expect(selectReporterResearchSeeds(input).map(s => s.id)).toEqual(['first']);
});
