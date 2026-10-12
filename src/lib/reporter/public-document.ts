import { parseDocument } from 'htmlparser2';
import { fetchPublicHttpUrl, readResponseBytes } from '@/lib/security/safe-fetch';

type HtmlNode = ReturnType<typeof parseDocument>['children'][number];
const OMIT_TAGS = new Set(['script', 'style', 'nav', 'aside', 'footer', 'header', 'form', 'iframe', 'svg', 'textarea', 'noscript']);
const BLOCK_TAGS = new Set(['p', 'div', 'section', 'article', 'main', 'h1', 'h2', 'h3', 'li', 'tr', 'br']);

export interface ReporterPublicDocument {
  url: string;
  title: string | null;
  text: string;
  links: Array<{ url: string; label: string }>;
  retrievedAt: string;
}

export function normalizeReporterPublicUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

function children(node: HtmlNode): HtmlNode[] {
  return 'children' in node ? node.children : [];
}

function allNodes(node: HtmlNode): HtmlNode[] {
  return [node, ...children(node).flatMap(allNodes)];
}

function isOmitted(node: HtmlNode): boolean {
  if (!('attribs' in node)) return false;
  return OMIT_TAGS.has(node.name) || node.attribs['aria-hidden'] === 'true' ||
    'hidden' in node.attribs || /(?:^|[\s_-])(?:related|share|social|donate|subscribe|republish)(?:[\s_-]|$)/i.test(node.attribs.class || '');
}

function nodeText(node: HtmlNode): string {
  if (isOmitted(node)) return '';
  if (node.type === 'text') return node.data;
  const text = children(node).map(nodeText).join('');
  return 'name' in node && BLOCK_TAGS.has(node.name) ? `\n${text}\n` : text;
}

function cleanText(text: string) {
  return text.replace(/[\t \r\f]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** Extract the document body, never a listing's meta description or headline alone. */
export function extractReporterPublicDocument(html: string, url: string): ReporterPublicDocument {
  const dom = parseDocument(html);
  const nodes = allNodes(dom);
  const elements = nodes.filter((node) => 'attribs' in node);
  const root = elements.find((node) => node.attribs.itemprop === 'articleBody') ||
    elements.find((node) => /(?:^|\s)(?:entry-content|article-body|story-body|article__body)(?:\s|$)/.test(node.attribs.class || '')) ||
    elements.find((node) => node.name === 'article') ||
    elements.find((node) => node.name === 'main') ||
    elements.find((node) => node.name === 'body');
  if (!root) throw new Error('Public page has no readable document body.');
  const text = cleanText(nodeText(root)).slice(0, 24000);
  if (text.length < 160 || text.split(/\s+/).length < 25) {
    throw new Error('Public page contains too little document text for reporting.');
  }
  const links: ReporterPublicDocument['links'] = [];
  const visit = (node: HtmlNode) => {
    if (isOmitted(node)) return;
    if ('attribs' in node && node.name === 'a' && node.attribs.href) {
      try {
        const target = normalizeReporterPublicUrl(new URL(node.attribs.href, url).toString());
        if (target && target !== normalizeReporterPublicUrl(url) && !links.some((link) => link.url === target)) {
          links.push({ url: target, label: cleanText(nodeText(node)).slice(0, 180) });
        }
      } catch { /* Invalid links are not evidence. */ }
    }
    children(node).forEach(visit);
  };
  visit(root);
  const title = elements.find((node) => node.name === 'h1') || elements.find((node) => node.name === 'title');
  return { url, title: title ? cleanText(nodeText(title)).slice(0, 300) : null, text, links: links.slice(0, 80), retrievedAt: new Date().toISOString() };
}

export async function fetchReporterPublicDocument(url: string, signal?: AbortSignal): Promise<ReporterPublicDocument> {
  const response = await fetchPublicHttpUrl(url, {
    headers: { accept: 'text/html, text/plain', 'user-agent': 'HighlanderToday-Reporter/1.0' },
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000),
  }, 3);
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`Public source returned HTTP ${response.status}.`);
  }
  const contentType = response.headers.get('content-type') || '';
  if (!/text\/(?:html|plain)|application\/xhtml\+xml/i.test(contentType)) {
    await response.body?.cancel();
    throw new Error('Public source requires a supported HTML or plain-text document.');
  }
  const body = new TextDecoder().decode(await readResponseBytes(response, 2_000_000));
  const finalUrl = response.url || url;
  if (/text\/plain/i.test(contentType)) {
    const text = cleanText(body).slice(0, 24000);
    if (text.length < 160) throw new Error('Public source contains too little text for reporting.');
    return { url: finalUrl, title: null, text, links: [], retrievedAt: new Date().toISOString() };
  }
  return extractReporterPublicDocument(body, finalUrl);
}
