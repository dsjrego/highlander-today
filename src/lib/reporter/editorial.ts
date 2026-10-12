import { sanitizeArticleHtml } from '@/lib/sanitize';

export function reporterTextToHtml(text: string) {
  const escape = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  return sanitizeArticleHtml(
    text
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p>${escape(p).replace(/\n/g, '<br />')}</p>`)
      .join('')
  );
}
