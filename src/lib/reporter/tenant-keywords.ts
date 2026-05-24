export const REPORTER_TENANT_KEYWORDS_SETTING_KEY = 'reporter_tenant_keywords';

function normalizeKeyword(value: string) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function parseReporterTenantKeywords(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  const seen = new Set<string>();
  const keywords: string[] = [];

  for (const rawPart of value.split(/[\n,]+/)) {
    const trimmed = rawPart.trim();
    if (!trimmed) {
      continue;
    }

    const normalized = normalizeKeyword(trimmed);
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    keywords.push(trimmed);
  }

  return keywords;
}

export function findReporterTenantKeywordMatches(
  text: string | null | undefined,
  keywords: string[]
) {
  const haystack = normalizeKeyword(text || '');
  if (!haystack) {
    return [];
  }

  return keywords.filter((keyword) => haystack.includes(normalizeKeyword(keyword)));
}
