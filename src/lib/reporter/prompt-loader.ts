import { createHash } from 'crypto';
import { readFile } from 'fs/promises';
import path from 'path';

export interface ReporterPromptTemplate {
  promptKey: string;
  promptVersion: string;
  owner: string;
  purpose: string;
  body: string;
  hash: string;
  filePath: string;
}

const REQUIRED_METADATA_KEYS = ['promptKey', 'promptVersion', 'owner', 'purpose'] as const;
const promptTemplateCache = new Map<string, ReporterPromptTemplate>();

function parseFrontMatter(source: string) {
  const trimmed = source.trimStart();
  if (!trimmed.startsWith('---')) {
    throw new Error('Prompt file is missing front matter.');
  }

  const closingIndex = trimmed.indexOf('\n---', 3);
  if (closingIndex === -1) {
    throw new Error('Prompt file front matter is not properly closed.');
  }

  const frontMatterBlock = trimmed.slice(3, closingIndex).trim();
  const body = trimmed.slice(closingIndex + 4).trim();
  const metadata: Record<string, string> = {};

  frontMatterBlock.split('\n').forEach((line) => {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) {
      return;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    metadata[key] = value;
  });

  for (const key of REQUIRED_METADATA_KEYS) {
    if (!metadata[key]) {
      throw new Error(`Prompt file is missing required metadata field: ${key}`);
    }
  }

  if (!body) {
    throw new Error('Prompt file body is empty.');
  }

  return { metadata, body };
}

export function hashReporterContent(content: string) {
  return createHash('sha256').update(content).digest('hex');
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(',')}}`;
}

export function hashReporterJson(value: unknown) {
  return hashReporterContent(stableStringify(value));
}

function resolvePromptPath(promptKey: string) {
  return path.join(process.cwd(), 'src/lib/reporter/prompts', `${promptKey}.md`);
}

export async function loadReporterPromptTemplate(promptKey: string): Promise<ReporterPromptTemplate> {
  const cached = promptTemplateCache.get(promptKey);
  if (cached) {
    return cached;
  }

  const filePath = resolvePromptPath(promptKey);
  const source = await readFile(filePath, 'utf8');
  const { metadata, body } = parseFrontMatter(source);

  const template: ReporterPromptTemplate = {
    promptKey: metadata.promptKey,
    promptVersion: metadata.promptVersion,
    owner: metadata.owner,
    purpose: metadata.purpose,
    body,
    hash: hashReporterContent(body),
    filePath,
  };

  promptTemplateCache.set(promptKey, template);
  return template;
}

export function renderReporterPromptTemplate(
  template: ReporterPromptTemplate,
  variables: Record<string, string | number | boolean | null | undefined>
) {
  return template.body.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = variables[key];
    return value === null || value === undefined ? '' : String(value);
  });
}

export function buildPromptTraceMetadata(params: {
  promptFamilyKey: string;
  templates: ReporterPromptTemplate[];
  renderedPrompts?: string[];
}) {
  const versions = params.templates.map((template) => template.promptVersion).join('/');
  const renderedHash = params.renderedPrompts?.length
    ? hashReporterContent(params.renderedPrompts.join('\n\n'))
    : hashReporterContent(params.templates.map((template) => template.hash).join(':'));

  return {
    promptKey: params.promptFamilyKey,
    promptVersion: versions,
    promptHash: renderedHash,
  };
}
