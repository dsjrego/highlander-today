import fs from 'fs';
import path from 'path';
import {
  type BrowserCollectedItem,
  mergeBrowserCollectedDetail,
  detectBrowserCollectorSourceFamily,
  finalizeBrowserCollectedItems,
} from '../src/lib/reporter/local-browser-collector';

type ParsedArgs = {
  sourceId: string;
  sourceUrl: string;
  baseUrl: string;
  ingestToken: string;
  publisher?: string;
  headless: boolean;
  waitMs: number;
  waitForSelector?: string;
  userDataDir: string;
};

type WorkerConfig = {
  baseUrl: string;
  ingestToken: string;
  schedulerToken: string;
  headless: boolean;
  waitMs: number;
  waitForSelector?: string;
  userDataDir: string;
  limit: number;
  communityId?: string;
  communitySlug?: string;
};

type DueBrowserSource = {
  id: string;
  communityId: string;
  label: string;
  sourceType: string;
  sourceFormat: string;
  executionLane: 'LOCAL_BROWSER';
  coverageScope: string;
  url: string;
  publisher: string | null;
  notes: string | null;
  fetchFrequencyMinutes: number;
  lastFetchedAt: string | null;
  community: {
    id: string;
    name: string;
    slug: string;
  };
  place: {
    id: string;
    displayName: string;
    slug: string;
    type: string;
  } | null;
};

function readArg(name: string) {
  const prefix = `--${name}=`;
  const match = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : undefined;
}

function readFlag(name: string) {
  return process.argv.slice(2).includes(`--${name}`);
}

function normalizeBaseUrl(value: string) {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function buildSharedRuntimeConfig() {
  const baseUrl =
    readArg('base-url') || process.env.REPORTER_LOCAL_BASE_URL || 'http://localhost:3000';
  const ingestToken =
    readArg('ingest-token') || process.env.REPORTER_SOURCE_INGEST_TOKEN || '';
  const waitForSelector =
    readArg('wait-for-selector') || process.env.REPORTER_LOCAL_WAIT_FOR_SELECTOR || undefined;
  const waitMs = Number(readArg('wait-ms') || process.env.REPORTER_LOCAL_WAIT_MS || '6000');
  const headlessArg = readArg('headless');
  const headless =
    headlessArg !== undefined
      ? headlessArg === 'true'
      : process.env.REPORTER_LOCAL_HEADLESS === 'true';
  const userDataDir =
    readArg('user-data-dir') ||
    process.env.REPORTER_LOCAL_USER_DATA_DIR ||
    path.join(process.cwd(), '.tmp', 'reporter-local-browser-profile');

  return {
    baseUrl: normalizeBaseUrl(baseUrl),
    ingestToken,
    headless,
    waitMs: Number.isFinite(waitMs) && waitMs >= 0 ? waitMs : 6000,
    waitForSelector,
    userDataDir,
  };
}

function resolveRequiredConfig() {
  const shared = buildSharedRuntimeConfig();
  const sourceId = readArg('source-id') || process.env.REPORTER_LOCAL_SOURCE_ID || '';
  const sourceUrl = readArg('source-url') || process.env.REPORTER_LOCAL_SOURCE_URL || '';
  const publisher = readArg('publisher') || process.env.REPORTER_LOCAL_SOURCE_PUBLISHER || undefined;

  if (!sourceId || !sourceUrl || !shared.ingestToken) {
    throw new Error(
      [
        'Missing required collector configuration.',
        'Provide --source-id, --source-url, and an ingest token via --ingest-token or REPORTER_SOURCE_INGEST_TOKEN.',
      ].join(' ')
    );
  }

  return {
    sourceId,
    sourceUrl,
    baseUrl: shared.baseUrl,
    ingestToken: shared.ingestToken,
    publisher,
    headless: shared.headless,
    waitMs: shared.waitMs,
    waitForSelector: shared.waitForSelector,
    userDataDir: shared.userDataDir,
  } satisfies ParsedArgs;
}

function resolveWorkerConfig(): WorkerConfig {
  const shared = buildSharedRuntimeConfig();
  const schedulerToken =
    readArg('scheduler-token') ||
    process.env.REPORTER_LOCAL_SCHEDULER_TOKEN ||
    process.env.REPORTER_SCHEDULER_TOKEN ||
    '';
  const limit = Number(readArg('limit') || process.env.REPORTER_LOCAL_RUN_LIMIT || '10');
  const communityId = readArg('community-id') || process.env.REPORTER_LOCAL_COMMUNITY_ID || undefined;
  const communitySlug =
    readArg('community-slug') || process.env.REPORTER_LOCAL_COMMUNITY_SLUG || undefined;

  if (!shared.ingestToken || !schedulerToken) {
    throw new Error(
      [
        'Missing required worker configuration.',
        'Set REPORTER_SOURCE_INGEST_TOKEN and REPORTER_SCHEDULER_TOKEN (or REPORTER_LOCAL_SCHEDULER_TOKEN).',
      ].join(' ')
    );
  }

  return {
    ...shared,
    schedulerToken,
    limit: Number.isFinite(limit) && limit > 0 ? Math.min(limit, 50) : 10,
    communityId,
    communitySlug,
  };
}

function buildRunConfigFromDueSource(workerConfig: WorkerConfig, source: DueBrowserSource): ParsedArgs {
  return {
    sourceId: source.id,
    sourceUrl: source.url,
    baseUrl: workerConfig.baseUrl,
    ingestToken: workerConfig.ingestToken,
    publisher: source.publisher || undefined,
    headless: workerConfig.headless,
    waitMs: workerConfig.waitMs,
    waitForSelector: workerConfig.waitForSelector,
    userDataDir: workerConfig.userDataDir,
  };
}

function normalizeDateText(value?: string | null) {
  const trimmed = (value || '').trim();
  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function omitNullishFields(item: BrowserCollectedItem) {
  const normalized: Record<string, unknown> = {
    title: item.title,
  };

  if (item.dedupeKey) normalized.dedupeKey = item.dedupeKey;
  if (item.externalId) normalized.externalId = item.externalId;
  if (item.canonicalUrl) normalized.canonicalUrl = item.canonicalUrl;
  if (item.excerpt) normalized.excerpt = item.excerpt;
  if (item.publishedAt) normalized.publishedAt = item.publishedAt;
  if (item.publisher) normalized.publisher = item.publisher;
  if (item.contentText) normalized.contentText = item.contentText;
  if (item.metadataJson) normalized.metadataJson = item.metadataJson;

  return normalized;
}

async function extractItemsFromPage(sourceUrl: string, config: ParsedArgs): Promise<BrowserCollectedItem[]> {
  let chromium: any;
  try {
    const loadPlaywright = new Function('return import("playwright")') as () => Promise<any>;
    ({ chromium } = await loadPlaywright());
  } catch {
    throw new Error(
      'Playwright is not installed. Install it locally with `npm install -D playwright` and `npx playwright install chromium`.'
    );
  }

  fs.mkdirSync(config.userDataDir, { recursive: true });

  const browserContext = await chromium.launchPersistentContext(config.userDataDir, {
    headless: config.headless,
    viewport: { width: 1440, height: 1200 },
  });

  try {
    const page = browserContext.pages()[0] || (await browserContext.newPage());
    await page.goto(sourceUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });

    if (config.waitForSelector) {
      await page.waitForSelector(config.waitForSelector, { timeout: 30_000 });
    } else if (config.waitMs > 0) {
      await page.waitForTimeout(config.waitMs);
    }

    const sourceFamily = detectBrowserCollectorSourceFamily(sourceUrl);

    const extracted = await page.evaluate(({ defaultPublisher, detectedFamily }: {
      defaultPublisher: string | null;
      detectedFamily: string;
    }) => {
      const MONTHS =
        '(?:Jan|January|Feb|February|Mar|March|Apr|April|May|Jun|June|Jul|July|Aug|August|Sep|Sept|September|Oct|October|Nov|November|Dec|December)';
      const datePattern = new RegExp(
        `\\b${MONTHS}\\.??\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,)?\\s+\\d{4}\\b|\\b\\d{1,2}(?:st|nd|rd|th)?\\s+${MONTHS}\\.??\\s+\\d{4}\\b|\\b\\d{4}-\\d{2}-\\d{2}\\b`,
        'i'
      );
      const timePattern = /\b\d{1,2}(?::\d{2})?\s?(?:a\.?m\.?|p\.?m\.?)\b/i;
      const eventTerms =
        /\b(event|class|classes|workshop|festival|concert|meeting|hearing|open house|presentation|exhibit|camp|market|fundraiser|reading)\b/i;
      const genericLinkLabels = new Set([
        'open',
        'details',
        'register',
        'buy tickets',
        'tickets',
        'rsvp',
        'learn more',
        'read more',
        'more info',
        'book now',
        'sign up',
        'join waitlist',
        'waitlist',
        'sold out',
      ]);

      function collapseWhitespace(value: string) {
        return value.replace(/\s+/g, ' ').trim();
      }

      function normalizeTitleForKey(value: string) {
        return collapseWhitespace(value)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
      }

      function isLikelyTitleText(value: string) {
        const text = collapseWhitespace(value);
        if (text.length < 8 || text.length > 160) {
          return false;
        }

        const lowered = text.toLowerCase();
        if (genericLinkLabels.has(lowered)) {
          return false;
        }
        if (datePattern.test(text) || /^(\d{1,2}:\d{2}|\d{1,2}\s?(?:a\.?m\.?|p\.?m\.?))/i.test(text)) {
          return false;
        }
        if (/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i.test(text)) {
          return false;
        }
        if (/^(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)$/i.test(text)) {
          return false;
        }
        if (!/[a-z]/i.test(text)) {
          return false;
        }

        return /\s/.test(text);
      }

      function extractTitle(node: Element) {
        const heading = node.querySelector('h1, h2, h3, h4');
        if (heading?.textContent) {
          const headingText = collapseWhitespace(heading.textContent);
          if (isLikelyTitleText(headingText)) {
            return headingText;
          }
        }

        const anchors = Array.from(node.querySelectorAll('a'));
        for (const anchor of anchors) {
          const label = collapseWhitespace(anchor.textContent || '');
          if (isLikelyTitleText(label)) {
            return label;
          }
        }

        const textNodes = Array.from(
          node.querySelectorAll('div, span, p, strong, h5, h6')
        );
        for (const child of textNodes) {
          const label = collapseWhitespace(child.textContent || '');
          if (isLikelyTitleText(label)) {
            return label;
          }
        }

        const rawLines = collapseWhitespace(node.textContent || '')
          .split(/(?<=[.?!])\s+|\s{2,}/)
          .map((line) => collapseWhitespace(line))
          .filter(Boolean);
        for (const line of rawLines) {
          if (isLikelyTitleText(line)) {
            return line;
          }
        }

        return null;
      }

      function extractCanonicalUrl(node: Element, sourceUrl: string) {
        const anchors = Array.from(node.querySelectorAll('a'));
        for (const anchor of anchors) {
          const href = anchor.getAttribute('href');
          const label = collapseWhitespace(anchor.textContent || '');
          if (!href || href.startsWith('javascript:') || href.startsWith('mailto:')) {
            continue;
          }
          if (genericLinkLabels.has(label.toLowerCase())) {
            continue;
          }
          try {
            return new URL(href, sourceUrl).toString();
          } catch {
            return href;
          }
        }

        return sourceUrl;
      }

      function extractImageUrl(node: Element, sourceUrl: string) {
        const image = node.querySelector('img');
        const candidate =
          image?.getAttribute('src') ||
          image?.getAttribute('data-src') ||
          image?.getAttribute('data-lazy-src') ||
          '';
        if (!candidate) {
          return null;
        }

        try {
          return new URL(candidate, sourceUrl).toString();
        } catch {
          return candidate;
        }
      }

      function extractExcerpt(node: Element, title: string) {
        const paragraphs = Array.from(node.querySelectorAll('p'));
        for (const paragraph of paragraphs) {
          const text = collapseWhitespace(paragraph.textContent || '');
          if (!text || text === title || text.length < 24) {
            continue;
          }
          return text.slice(0, 2000);
        }

        const text = collapseWhitespace(node.textContent || '');
        if (!text) {
          return null;
        }

        const withoutTitle = collapseWhitespace(text.replace(title, ''));
        return withoutTitle.length >= 24 ? withoutTitle.slice(0, 2000) : null;
      }

      function extractLocation(text: string) {
        const match =
          text.match(/\b(?:at|location:)\s+([A-Z][A-Za-z0-9&.'\- ]{4,100}?)(?:[.,;]|$)/) ||
          text.match(/\b(?:held|meet|meeting)\s+at\s+([A-Z][A-Za-z0-9&.'\- ]{4,100}?)(?:[.,;]|$)/);
        return match?.[1]?.trim() || null;
      }

      function hasEventSignals(text: string) {
        return datePattern.test(text) || timePattern.test(text) || eventTerms.test(text);
      }

      function findLikelyCardRoot(seed: Element) {
        let current: Element | null = seed;
        let best: Element | null = null;

        while (current && current !== document.body) {
          const tagName = current.tagName.toLowerCase();
          const rawText = collapseWhitespace(current.textContent || '');
          if (
            rawText.length >= 60 &&
            rawText.length <= 1600 &&
            hasEventSignals(rawText)
          ) {
            best = current;
            if (tagName === 'article' || tagName === 'li' || tagName === 'section') {
              return current;
            }
          }
          current = current.parentElement;
        }

        return best;
      }

      function buildItemFromBlock(block: Element, family: string) {
        const rawText = collapseWhitespace(block.textContent || '');
        if (!rawText || rawText.length < 40 || rawText.length > 1800) {
          return null;
        }

        const title = extractTitle(block);
        if (!title || title.length < 8 || title.length > 160) {
          return null;
        }

        if (!hasEventSignals(rawText)) {
          return null;
        }

        const excerpt = extractExcerpt(block, title);
        const canonicalUrl = extractCanonicalUrl(block, window.location.href);
        const imageUrl = extractImageUrl(block, window.location.href);
        const publishedAtMatch = rawText.match(datePattern)?.[0] || null;
        const eventLocation = extractLocation(rawText);

        return {
          dedupeKey: family === 'getoccasion' ? `getoccasion:${normalizeTitleForKey(title)}` : `browser-dom:${normalizeTitleForKey(title)}`,
          canonicalUrl,
          title,
          excerpt,
          publishedAt: publishedAtMatch,
          publisher:
            defaultPublisher ||
            collapseWhitespace(
              (document.querySelector('meta[property="og:site_name"]') as HTMLMetaElement | null)?.content ||
                ''
            ) ||
            null,
          contentText: excerpt || rawText.slice(0, 12000),
          metadataJson: {
            format: 'HTML',
            extractionMode: family === 'getoccasion' ? 'browser-getoccasion-card' : 'browser-dom',
            eventLocation,
            imageUrl,
            renderedUrl: window.location.href,
          },
        } satisfies BrowserCollectedItem;
      }

      function extractGetOccasionItems() {
        const roots = new Set<Element>();
        const headingSeeds = Array.from(document.querySelectorAll('h1, h2, h3, h4, strong'));
        const anchorSeeds = Array.from(document.querySelectorAll('a[href]'));

        for (const seed of [...headingSeeds, ...anchorSeeds]) {
          const label = collapseWhitespace(seed.textContent || '');
          if (!isLikelyTitleText(label) && !hasEventSignals(label)) {
            continue;
          }

          const root = findLikelyCardRoot(seed);
          if (root) {
            roots.add(root);
          }
        }

        return (Array.from(roots)
          .map((root) => buildItemFromBlock(root, 'getoccasion'))
          .filter((item) => item !== null) as BrowserCollectedItem[])
          .slice(0, 16);
      }

      const blocks = Array.from(document.querySelectorAll('article, section, li, div'));
      const seen = new Set<string>();
      const results: BrowserCollectedItem[] = [];

      if (detectedFamily === 'getoccasion') {
        return extractGetOccasionItems();
      }

      for (const block of blocks) {
        const item = buildItemFromBlock(block, 'generic');
        if (!item) {
          continue;
        }

        const dedupeKey = item.dedupeKey || `browser-dom:${normalizeTitleForKey(item.title)}`;
        if (!dedupeKey || seen.has(dedupeKey)) {
          continue;
        }

        seen.add(dedupeKey);
        results.push(item);

        if (results.length >= 25) {
          break;
        }
      }

      return results;
    }, {
      defaultPublisher: config.publisher || null,
      detectedFamily: sourceFamily,
    });

    const normalizedExtracted = extracted
        .map((item: BrowserCollectedItem) => ({
        ...item,
        publishedAt: normalizeDateText(item.publishedAt),
      }))
        .filter((item: BrowserCollectedItem) => item.title.trim().length > 0);

    const enrichedExtracted =
      sourceFamily === 'getoccasion'
        ? await enrichGetOccasionDetailItems(browserContext, normalizedExtracted, config)
        : normalizedExtracted;

    return finalizeBrowserCollectedItems(
      enrichedExtracted,
      sourceUrl
    );
  } finally {
    await browserContext.close();
  }
}

async function enrichGetOccasionDetailItems(
  browserContext: any,
  items: BrowserCollectedItem[],
  config: ParsedArgs
) {
  const enriched: BrowserCollectedItem[] = [];

  for (const item of items) {
    if (!item.canonicalUrl) {
      enriched.push(item);
      continue;
    }

    const detailPage = await browserContext.newPage();
    try {
      await detailPage.goto(item.canonicalUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 60_000,
      });
      await detailPage.waitForTimeout(Math.min(Math.max(config.waitMs, 1500), 4000));

      const detail = await detailPage.evaluate(() => {
        function collapseWhitespace(value: string) {
          return value.replace(/\s+/g, ' ').trim();
        }

        function metaContent(name: string) {
          const element = document.querySelector(
            `meta[property="${name}"], meta[name="${name}"]`
          ) as HTMLMetaElement | null;
          return collapseWhitespace(element?.content || '');
        }

        function textFromSelector(selector: string) {
          const element = document.querySelector(selector);
          return collapseWhitespace(element?.textContent || '');
        }

        function absoluteUrl(candidate?: string | null) {
          const raw = collapseWhitespace(candidate || '');
          if (!raw) {
            return null;
          }

          try {
            return new URL(raw, window.location.href).toString();
          } catch {
            return raw;
          }
        }

        function extractLargestSrcsetCandidate(srcset?: string | null) {
          const raw = collapseWhitespace(srcset || '');
          if (!raw) {
            return null;
          }

          const candidates = raw
            .split(',')
            .map((entry) => collapseWhitespace(entry))
            .map((entry) => {
              const [url, descriptor] = entry.split(/\s+/);
              const widthMatch = descriptor?.match(/^(\d+)w$/i);
              const densityMatch = descriptor?.match(/^(\d+(?:\.\d+)?)x$/i);
              return {
                url: absoluteUrl(url),
                score: widthMatch
                  ? Number(widthMatch[1])
                  : densityMatch
                    ? Number(densityMatch[1]) * 1000
                    : 0,
              };
            })
            .filter((candidate) => candidate.url);

          if (candidates.length === 0) {
            return null;
          }

          candidates.sort((left, right) => right.score - left.score);
          return candidates[0]?.url || null;
        }

        function extractImageUrl() {
          const contentImages = Array.from(
            document.querySelectorAll('main img, article img, section img, [class*="hero"] img, [class*="cover"] img')
          ) as HTMLImageElement[];

          const rankedImages = contentImages
            .map((image) => {
              const largestSrcset = extractLargestSrcsetCandidate(image.getAttribute('srcset'));
              const currentSrc = absoluteUrl(image.currentSrc || null);
              const dataSrc = absoluteUrl(image.getAttribute('data-src'));
              const src = absoluteUrl(image.getAttribute('src'));
              const width = image.naturalWidth || image.width || 0;
              const height = image.naturalHeight || image.height || 0;
              const areaScore = width > 0 && height > 0 ? width * height : 0;
              return {
                url: largestSrcset || currentSrc || dataSrc || src,
                score: areaScore,
              };
            })
            .filter((entry) => entry.url);

          if (rankedImages.length > 0) {
            rankedImages.sort((left, right) => right.score - left.score);
            return rankedImages[0]?.url || null;
          }

          const metaImage = metaContent('og:image') || metaContent('twitter:image') || '';
          return metaImage ? absoluteUrl(metaImage) : null;
        }

        function pickDetailText() {
          const selectors = [
            '[class*="description"]',
            '[class*="content"]',
            '[class*="details"]',
            '[class*="about"]',
            'article',
            'main',
          ];

          const candidates = selectors
            .map((selector) => textFromSelector(selector))
            .filter((value) => value.length >= 60);

          return candidates.sort((left, right) => right.length - left.length)[0] || '';
        }

        const title =
          textFromSelector('h1') ||
          metaContent('og:title') ||
          metaContent('twitter:title') ||
          '';
        const excerpt =
          textFromSelector('main p') ||
          metaContent('description') ||
          metaContent('og:description') ||
          '';
        const contentText = pickDetailText() || excerpt;
        const canonicalUrl =
          absoluteUrl(
            (document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null)?.href ||
              window.location.href
          ) || window.location.href;
        const imageUrl = extractImageUrl();

        return {
          title: title || null,
          canonicalUrl,
          excerpt: excerpt || null,
          contentText: contentText || null,
          imageUrl,
        };
      });

      enriched.push(mergeBrowserCollectedDetail(item, detail));
    } catch {
      enriched.push(item);
    } finally {
      await detailPage.close();
    }
  }

  return enriched;
}

async function postFetchResult(config: ParsedArgs, items: BrowserCollectedItem[]) {
  const completedAt = new Date().toISOString();
  const response = await fetch(
    `${config.baseUrl}/api/admin/reporter/monitored-sources/${config.sourceId}/record-fetch`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${config.ingestToken}`,
      },
      body: JSON.stringify({
        status: 'SUCCESS',
        startedAt: completedAt,
        completedAt,
        httpStatus: 200,
        items: items.map(omitNullishFields),
      }),
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detailText = Array.isArray(data?.details)
      ? data.details
          .map((detail: { path?: Array<string | number>; message?: string }) => {
            const path = Array.isArray(detail.path) ? detail.path.join('.') : '';
            return path && detail.message ? `${path}: ${detail.message}` : detail.message || path || '';
          })
          .filter(Boolean)
          .join(' | ')
      : '';
    throw new Error(
      typeof data?.error === 'string'
        ? `Ingest failed: ${data.error}${detailText ? ` (${detailText})` : ''}`
        : `Ingest failed with HTTP ${response.status}`
    );
  }

  return data;
}

async function postFailedFetchResult(config: ParsedArgs, errorMessage: string) {
  const completedAt = new Date().toISOString();
  const response = await fetch(
    `${config.baseUrl}/api/admin/reporter/monitored-sources/${config.sourceId}/record-fetch`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${config.ingestToken}`,
      },
      body: JSON.stringify({
        status: 'FAILED',
        startedAt: completedAt,
        completedAt,
        httpStatus: 500,
        errorMessage,
      }),
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof data?.error === 'string'
        ? `Failed to record browser-worker failure: ${data.error}`
        : `Failed to record browser-worker failure with HTTP ${response.status}`
    );
  }

  return data;
}

async function fetchDueBrowserSources(config: WorkerConfig) {
  const searchParams = new URLSearchParams({
    limit: String(config.limit),
  });

  if (config.communityId) {
    searchParams.set('communityId', config.communityId);
  }
  if (config.communitySlug) {
    searchParams.set('communitySlug', config.communitySlug);
  }

  const response = await fetch(
    `${config.baseUrl}/api/admin/reporter/monitored-sources/due-browser-sources?${searchParams.toString()}`,
    {
      headers: {
        authorization: `Bearer ${config.schedulerToken}`,
      },
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof data?.error === 'string'
        ? `Failed to list due browser sources: ${data.error}`
        : `Failed to list due browser sources with HTTP ${response.status}`
    );
  }

  return Array.isArray(data?.sources) ? (data.sources as DueBrowserSource[]) : [];
}

async function runSingleSource(config: ParsedArgs) {
  console.log(`Opening ${config.sourceUrl}`);
  console.log(`Browser mode: ${config.headless ? 'headless' : 'headed persistent-profile'}`);

  const items = await extractItemsFromPage(config.sourceUrl, config);
  if (!items.length) {
    throw new Error(
      'No likely event items were extracted from the rendered page. Try a longer wait, a wait selector, or headed mode.'
    );
  }

  console.log(`Extracted ${items.length} items. Posting to Highlander Today…`);
  const result = await postFetchResult(config, items);
  console.log(
    JSON.stringify(
      {
        sourceId: config.sourceId,
        itemCount: result?.summary?.itemCount ?? items.length,
        newItemCount: result?.summary?.newItemCount ?? null,
        changedItemCount: result?.summary?.changedItemCount ?? null,
      },
      null,
      2
    )
  );
}

async function runWorkerMode(config: WorkerConfig) {
  const dueSources = await fetchDueBrowserSources(config);
  if (!dueSources.length) {
    console.log('No due local-browser sources were returned.');
    return;
  }

  console.log(`Found ${dueSources.length} due local-browser source${dueSources.length === 1 ? '' : 's'}.`);

  const results: Array<{
    sourceId: string;
    communitySlug: string;
    status: 'SUCCESS' | 'FAILED';
    itemCount?: number;
    message?: string;
  }> = [];

  for (const source of dueSources) {
    const runConfig = buildRunConfigFromDueSource(config, source);
    console.log(`Running ${source.label} for ${source.community.slug} (${source.url})`);

    try {
      const items = await extractItemsFromPage(source.url, runConfig);
      if (!items.length) {
        throw new Error('No likely event items were extracted from the rendered page.');
      }

      const result = await postFetchResult(runConfig, items);
      results.push({
        sourceId: source.id,
        communitySlug: source.community.slug,
        status: 'SUCCESS',
        itemCount: result?.summary?.itemCount ?? items.length,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      try {
        await postFailedFetchResult(runConfig, message);
      } catch (postError) {
        console.error(
          `Failed to record browser-worker failure for ${source.label}: ${
            postError instanceof Error ? postError.message : String(postError)
          }`
        );
      }

      results.push({
        sourceId: source.id,
        communitySlug: source.community.slug,
        status: 'FAILED',
        message,
      });
    }
  }

  console.log(JSON.stringify({ processed: results.length, results }, null, 2));
}

async function main() {
  if (readFlag('help')) {
    console.log(`
Usage:
  npm run reporter:collect:local -- --source-id=<id> --source-url=<url> [--base-url=http://localhost:3000]
  npm run reporter:collect:local -- --scheduler-token=<token> [--base-url=http://localhost:3000]

Required:
  --source-id           ReporterMonitoredSource id in Highlander Today
  --source-url          Public page to open in the local browser
  --ingest-token        Or set REPORTER_SOURCE_INGEST_TOKEN

Worker mode:
  --scheduler-token     Or set REPORTER_SCHEDULER_TOKEN / REPORTER_LOCAL_SCHEDULER_TOKEN
  --community-id        Optional tenant/community scope
  --community-slug      Optional tenant/community scope
  --limit=10            Max due sources to fetch this pass

Optional:
  --publisher=<name>
  --headless=true|false
  --wait-ms=6000
  --wait-for-selector=.event-card
  --user-data-dir=.tmp/reporter-local-browser-profile
`.trim());
    return;
  }

  const hasSingleSourceArgs = Boolean(
    readArg('source-id') ||
      process.env.REPORTER_LOCAL_SOURCE_ID ||
      readArg('source-url') ||
      process.env.REPORTER_LOCAL_SOURCE_URL
  );

  if (hasSingleSourceArgs) {
    await runSingleSource(resolveRequiredConfig());
    return;
  }

  await runWorkerMode(resolveWorkerConfig());
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
