import { describe, expect, it } from '@jest/globals';
import {
  buildPromptTraceMetadata,
  hashReporterJson,
  loadReporterPromptTemplate,
  renderReporterPromptTemplate,
} from '@/lib/reporter/prompt-loader';

describe('reporter prompt loader', () => {
  it('loads prompt metadata and body from versioned markdown files', async () => {
    const template = await loadReporterPromptTemplate('interview-next-step.system');

    expect(template.promptKey).toBe('interview-next-step.system');
    expect(template.promptVersion).toBe('1');
    expect(template.owner).toBe('reporter');
    expect(template.body).toContain('Highlander Today interviewer agent');
    expect(template.hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('renders template placeholders and builds stable trace metadata', async () => {
    const template = await loadReporterPromptTemplate('draft-generation.user');
    const rendered = renderReporterPromptTemplate(template, {
      sourcePacketPrompt: 'Topic: Bridge closure',
    });

    expect(rendered).toContain('Topic: Bridge closure');

    const traceMetadata = buildPromptTraceMetadata({
      promptFamilyKey: 'draft-generation',
      templates: [template],
      renderedPrompts: [rendered],
    });

    expect(traceMetadata).toMatchObject({
      promptKey: 'draft-generation',
      promptVersion: '1',
    });
    expect(traceMetadata.promptHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('hashes json inputs deterministically', () => {
    const first = hashReporterJson({ b: 2, a: 1 });
    const second = hashReporterJson({ a: 1, b: 2 });

    expect(first).toBe(second);
  });
});
